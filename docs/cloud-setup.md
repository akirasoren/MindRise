# Enable account saves

The integration is implemented but disabled until `cloud-config.js` contains your public project values. The existing demo and `mindrise-prototype-v1` progress keep working. No real credentials are committed.

## 1. Create a free Supabase project

Open https://supabase.com/dashboard and create a project on the Free plan. Choose a region near your testers. Store the database password privately; the website does not need it.

In the project SQL Editor, run the entire file `supabase/migrations/202611110001_progress.sql`. It creates one progress table, owner-only read rules, and an authenticated atomic save function. It does not delete existing records. Keep SQL changes in migrations when extending this schema.

## 2. Configure Google sign-in

Follow https://supabase.com/docs/guides/auth/social-sign-in/auth-google for the current dashboard labels.

1. Create/select a Google Cloud project and configure its OAuth consent screen. For a small pilot, use Testing status and add each tester's Google account as a test user. School-managed accounts may have administrator restrictions.
2. Create an OAuth client of type **Web application**. Set the authorized JavaScript origin to your hosted app origin, e.g. `https://mindrise-trx.vercel.app`.
3. In Supabase Authentication → Sign In / Providers → Google, copy the callback URL. Add that exact URL to Google's **Authorized redirect URIs**; typically `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. Paste the Google client ID and client secret into the Supabase Google provider settings and enable the provider. These credentials belong in the dashboards, never in `cloud-config.js` or this chat.
5. In Supabase Authentication → URL Configuration, set **Site URL** to the production site. Add the exact allowed return URL, e.g. `https://mindrise-trx.vercel.app/`. Add an exact preview URL for testing and `http://localhost:3000/` if needed. If opening `/index.html`, allow that exact path too. Avoid broad wildcard production redirects.

The app uses PKCE and returns to the same origin/path where sign-in began. Use HTTP localhost or HTTPS, not a `file://` URL. This approach does not use Supabase's default email sender.

## 3. Fill in public configuration

Find the project URL and **publishable** key in the project's Connect/API settings. Edit `cloud-config.js`:

```js
window.MINDRISE_CLOUD_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  publishableKey: 'sb_publishable_YOUR_KEY',
};
```

These two values are intentionally public. The app accepts the modern `sb_publishable_` key. Do not use a secret key, service-role key, database password, or Google client secret. RLS and the RPC enforce authorization independently of the public key.

The browser loads Supabase JS **2.119.0** from jsDelivr only when configuration is present. If that CDN is unreachable, cloud sign-in fails gracefully while the local demo remains available. The SDK stores its authentication session under `mindrise-auth-v1`; account progress stays in page memory and Supabase, not the legacy demo storage key.

## 4. Preview and verify before release

Deploy a preview using your normal Vercel workflow after setting the public configuration and registering its exact redirect URL. Nothing has been deployed automatically by this implementation.

- Sign in with account A. On a new account, choose **Start fresh**; verify no sample tasks, sleep logs, or check-ins appear. One starter seed is included.
- In the browser that holds existing tester progress, sign in with a new account and choose **Use browser progress**. Confirm the copy includes logs, notes, tasks, garden, purchases, and existing reward history. Imported sample entries remain sample entries; the app cannot reliably infer which old entries were real. Original local progress is kept.
- Sign in with the same account in a different browser/device. Confirm it loads cloud progress without replacing it with that browser's demo.
- Sign in with account B. Verify A's data is invisible. In browser DevTools, attempt to select A's UUID using B's session: no row should be returned. A save RPC with `p_user_id` set to A while signed in as B must return a permission error. Anonymous reads and saves must fail.
- Open two copies at the same revision. Save in the first and then the second. The second must stop at a conflict, keep unsynced changes exportable, and require explicit cloud reload. No automatic merge or overwrite.
- Disconnect during saving. Check **Couldn’t save**, download a backup, reconnect, and retry. A retry uses the same mutation UUID; a lost success response must not increment twice.
- Sign out and ensure the account's private state is removed from the page. The independent local demo remains, including the original imported source. On a shared device, clear/reset that demo separately only after ensuring the account copy is saved.
- Try two genuinely separate Supabase users and real Google OAuth. Browser mocks do not establish database authorization or provider configuration.

## Limits and recovery

- Account editing requires internet. During saving, the app briefly prevents additional edits. Errors/conflicts keep the in-memory snapshot and offer recovery controls. Do not close the page until saved or downloaded. Browser unload warnings are best effort; forced termination can lose an unsynced edit.
- There is no background cross-device refresh. Reload to see another device's latest changes; revision checks prevent an old page from silently replacing them.
- Downloaded JSON backups contain private wellness information. Keep them private. This version offers export, not an arbitrary backup-file import UI; a developer can restore a validated backup with the same authenticated revision workflow.
- Google auth sessions persist in browser storage; sign out on shared devices. Account progress itself is not cached there. Signing out here uses the local-session scope; other signed-in sessions may remain active.
- Rewards are still calculated by the browser and users can manipulate their own record. Do not use Gems for real-money rewards, competitions, or trusted rankings.
- Supabase Free currently includes 500 MB database storage and 5 GB egress. Inactive projects can pause after one week and automatic backups are not included. Use exports plus an owner-managed database backup procedure; monitor project usage. Snapshot writes send the full progress object, so large histories eventually warrant normalized tables.
- AI support costs remain separate. Cloud records are never passed into `/api/chat`.

## Verification performed locally

Run `node --test tests/*.test.js` for controller validation, retries, revisions, session isolation, and existing support tests. Run `node tests/cloud-browser.cjs` with Playwright available (or `NODE_PATH` pointing to the bundled tool runtime) and installed Chrome for simulated-provider browser checks.

Real Google OAuth and SQL/RLS checks remain required in the configured Supabase project. There is no local PostgreSQL server in this workspace, so the migration has been reviewed but not executed here.

Sources: https://supabase.com/pricing · https://supabase.com/docs/guides/auth/redirect-urls · https://supabase.com/docs/guides/database/postgres/row-level-security
