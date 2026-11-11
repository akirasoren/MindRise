# Authentication Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore email/password as the primary account path, run Google OAuth in a popup with redirect fallback, preserve the demo, and remove Prototype badges.

**Architecture:** Keep the existing vanilla authentication page and Supabase client. `index.html` renders the three choices; `cloud-account.js` owns email authentication, popup lifecycle, callback handoff, and fallback. Browser tests mock Supabase and assert the user-visible flow.

**Tech Stack:** Vanilla JavaScript, Supabase JS 2.119.0, HTML `<dialog>` only for existing app dialogs, Node and Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-12-auth-options-design.md`

## Global Constraints

- Email/password is visually primary; Google and demo are secondary.
- Only Google opens a popup; email flows remain in the main tab.
- Popup failure falls back to Supabase's normal full-page redirect.
- Existing demo and account progress separation must remain intact.
- No Prototype badge remains on the homepage or dashboard.
- Work in the current feature workspace because the cloud implementation is uncommitted here; do not commit or deploy without the user's request.

## Review Focus

- Popup blockers must still let Google authentication proceed by redirect.
- A successful popup callback must load the session in the opener exactly once.
- Closing the popup without authenticating must leave email/demo choices usable.
- Sign-up with email confirmation must not enter an unauthenticated account screen.
- Existing account saves and sign-out must behave unchanged for all providers.

---

### Task 1: Authentication-page behavior tests

**Files:**
- Modify: `tests/cloud-browser.cjs`

**Interfaces:**
- Consumes: mocked Supabase client and existing landing actions.
- Produces: assertions for primary email forms, Google popup/fallback options, demo choice, and removed badges.

- [x] Write browser assertions for sign-up fields, login fields, email SDK calls, Google `skipBrowserRedirect`, popup creation, and absent Prototype labels.
- [x] Run `node tests/cloud-browser.cjs` with the bundled `NODE_PATH`; expect failure because the current modal-only flow has no email authentication.

### Task 2: Email/password and Google popup implementation

**Files:**
- Modify: `index.html`
- Modify: `cloud-account.js`
- Modify: `cloud-account.css`

**Interfaces:**
- Consumes: `data-cloud-email-form`, `data-cloud-login`, Supabase `signUp`, `signInWithPassword`, and `signInWithOAuth`.
- Produces: authenticated sessions passed to existing `loadUser(user)` and unchanged cloud-save behavior.

- [x] Render email/password as the main form and Google/demo as secondary actions; remove the account modal and both Prototype badges.
- [x] Submit sign-up/sign-in through Supabase and display confirmation/errors without changing pages prematurely.
- [x] Request the Google OAuth URL with `skipBrowserRedirect:true`, open it in a named popup, notify the opener on callback, and redirect the main tab if the popup is blocked.
- [x] Run the browser test; expect all authentication and existing cloud-save scenarios to pass.

### Task 3: Full verification

**Files:**
- Verify: `tests/*.test.js`
- Verify: `tests/cloud-browser.cjs`

**Interfaces:**
- Consumes: completed authentication UI and cloud integration.
- Produces: regression evidence and final screenshots.

- [x] Run all Node tests, browser flow, syntax checks, and `git diff --check`.
- [x] Inspect desktop and mobile authentication screenshots and correct any blocking visual defect.

## Execution record

- Ruling: the bundled SDD ledger shell helper was not executable in this Windows runtime, so RED→GREEN evidence remained in the session and this plan checklist.
- Final review fix: a session-storage popup marker now survives providers that clear `window.name`; the callback test clears the name and proves one opener load.
- Final review fix: authentication is serialized so concurrent Google/email starts cannot overwrite the PKCE verifier; repeated Google clicks focus the existing popup.
- Final review fix: login no longer applies the sign-up-only eight-character minimum.
- Deferred minor: an OAuth callback that returns without a session relies on the popup-close recovery message rather than forwarding a provider-specific denial message.
- Deferred minor: the legacy-demo browser setup still reaches the real public config file before switching to its mock config; the scenario passed but could be made more hermetic later.
