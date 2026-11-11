# Cloud save implementation plan

> Execute inline using superpowers:executing-plans. User has authorized implementation; do not require another approval of the same scope.

**Goal:** Restore tester progress across browsers with Google sign-in and private cloud saves.
**Architecture:** Existing renderer plus separate testable save controller, browser integration, public config, and atomic PostgreSQL RPC.
**Tech Stack:** Vanilla JavaScript, pinned Supabase JS SDK, PostgreSQL, Node tests.
**Spec:** ../specs/2026-11-11-cloud-save-design.md

## Global constraints
- Preserve legacy demo storage; never write account progress into it.
- No secret credentials, automatic importing, whole-state overwrite on conflict, or offline merge.
- Keep current appearance and support-chat data isolation.

## Review focus
- Lost responses and retries must not duplicate saves.
- Session changes during requests must not restore old account state.
- Invalid snapshots must not break rendering.
- Failed initialization must not expose demo as account progress.
- Pending updates must remain exportable on error/conflict.

## Tasks
- [ ] 1. Add behavior tests for validation, serialized saves, conflicts, retry identity, and session reset. Run red; implement cloud-store.js; run green.
- [ ] 2. Add SQL migration with private reads and atomic authenticated compare-and-swap saves. Validate with local PostgreSQL tooling if available; otherwise provide explicit live checklist.
- [ ] 3. Add public config and cloud-account.js; integrate login, import/new-account choice, status, retry, reload, backup, sign-out, and guards into existing UI. Verify demo and mocked account flows in a browser.
- [ ] 4. Update README/help/setup docs, run full suite and diff checks, review changes, report external setup and verification limits.

## Ledger
Ruling: existing implementation approval covers this written specification and inline execution. Keep changes reviewable and uncommitted in the provided feature workspace; no deployment or remote project mutation without configuration.
