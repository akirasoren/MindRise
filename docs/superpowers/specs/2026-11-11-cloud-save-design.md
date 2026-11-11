# Minimal account cloud saves

Approved direction: the user requested implementation of the preceding discussion on 2026-11-11.

Keep the vanilla app and existing demo. Use Google OAuth through Supabase and one private JSON progress record per account. Store no account progress in the legacy demo key. Explicitly offer browser-progress import only when the account has no cloud record; alternatively initialize an empty account. Preserve the original browser record. Existing account data always wins on initial load.

Each save compares a server revision and carries an idempotency UUID. A conflict stops editing and offers backup/download and explicit cloud reload. A network failure retains the pending snapshot in memory and offers retry. Warn before leaving with pending changes. Cloud editing requires a connection; no offline merge queue. Sign-out clears account state from memory and returns to the independent demo.

Use a fixed Supabase browser SDK version, public project configuration, RLS for owner-only reads, and an authenticated SQL function for atomic writes. No admin keys in browser code. No data goes to support chat. Rewards remain client-calculated as agreed for this prototype. Keep artwork, typography, and page composition unchanged; new controls use existing components.

Alternatives considered: normalized tables and protected reward transactions (future scale, larger change); manual export only (does not solve cross-device access). Selected: versioned per-user snapshot, with export as an independent backup.

External setup: owner creates a Free Supabase project, applies SQL, configures Google OAuth and allowed redirects, supplies public URL/publishable key. Live two-account authorization and OAuth checks are required before release.
