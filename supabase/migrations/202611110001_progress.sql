-- Apply once in your project's Supabase SQL Editor. No existing app data is deleted.
begin;
create table if not exists public.mindrise_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'version' = '1' and octet_length(payload::text) <= 1000000),
  revision integer not null check (revision > 0),
  mutation_id uuid not null,
  updated_at timestamptz not null default now()
);
alter table public.mindrise_progress enable row level security;
revoke all on public.mindrise_progress from anon, authenticated;
grant select on public.mindrise_progress to authenticated;
drop policy if exists "Read own progress" on public.mindrise_progress;
create policy "Read own progress" on public.mindrise_progress for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_mindrise_progress(p_user_id uuid, p_payload jsonb, p_expected_revision integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved public.mindrise_progress;
begin
  if owner_id is null or p_user_id is distinct from owner_id then raise exception 'Sign in required for this account' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_mutation_id is null
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or (p_payload->>'version') is distinct from '1' or octet_length(p_payload::text) > 1000000 then
    raise exception 'Invalid progress' using errcode = '22023';
  end if;
  -- A concurrent first save inserts only once; all other writes go through the locked row.
  if p_expected_revision = 0 then
    insert into public.mindrise_progress(user_id,payload,revision,mutation_id)
    values(owner_id,p_payload,1,p_mutation_id) on conflict(user_id) do nothing;
  end if;
  select * into saved from public.mindrise_progress where user_id=owner_id for update;
  if found and saved.mutation_id=p_mutation_id and saved.revision=p_expected_revision+1 and saved.payload=p_payload then
    return jsonb_build_object('revision',saved.revision);
  end if;
  if not found or saved.revision <> p_expected_revision then
    raise exception 'Progress changed on another device' using errcode = '40001';
  end if;
  update public.mindrise_progress set payload=p_payload, revision=revision+1, mutation_id=p_mutation_id, updated_at=now()
  where user_id=owner_id returning * into saved;
  return jsonb_build_object('revision',saved.revision);
end;
$$;
revoke all on function public.save_mindrise_progress(uuid,jsonb,integer,uuid) from public, anon;
grant execute on function public.save_mindrise_progress(uuid,jsonb,integer,uuid) to authenticated;
commit;
