# MindRise PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. This is a proposed plan, not authorization to implement.

**Goal:** Make MindRise installable and able to launch offline while preserving Supabase authentication, cross-device account progress, the local demo, appearance, and saved progress.

**Architecture:** Add a manifest and a small vanilla JavaScript service worker around the existing app. Cache a complete, versioned set of public app files; keep Supabase, OAuth, CDN, and API traffic network-only. An open account session locks editing when disconnected; a cold offline launch opens the editable local demo until the user reconnects and reloads.

**Tech Stack:** Existing HTML/CSS/JavaScript, Web App Manifest, Service Worker and Cache Storage APIs, existing Vercel API, Node test runner.

**Spec:** Requirements and proposed decisions below, based on the user's request to preserve existing features. No separate approved design exists yet.

## Requirements and proposed decisions

- Preserve tasks/classes, sleep and mood logs, rewards, garden growth, customization, PNG exports, profile settings, demo login/logout/reset, and support chat online.
- Preserve `mindrise-prototype-v1`, Supabase's `mindrise-auth-v1` session, and the existing version-1 progress schema. No storage migration is necessary for this scope.
- Keep the same production origin. Data from file URLs, preview domains, different browsers, or separate platform storage containers must not be assumed to transfer automatically.
- Installation is optional. Continue to support browser use and degrade gracefully when service workers are unavailable.
- New UI is limited to installation guidance, offline status, and an update notice. Existing business rules stay unchanged.
- Offline support begins only after successful initial download and caching. API support chat needs a connection; do not cache replies or queue/replay questions.
- Preserve email/password and Google OAuth account entry. Do not cache authentication redirects, sessions, Supabase responses, or account payloads.
- No offline cloud editing, push notifications, background reminders, or app-store publication in this migration.

## Approaches

1. Manifest-only installation: smallest change, but does not deliver reliable offline loading.
2. **Recommended: installation plus cached local features.** Fits the current browser-local architecture with limited changes.
3. Full offline synchronization with accounts and cloud storage: separate product work requiring a durable mutation queue and conflict UX, outside this release.

## Review focus

- Existing saved progress survives deployment, service-worker updates, and app restarts (tasks 1 and 4).
- Failed or partial downloads never replace a complete working release (tasks 3 and 4).
- An update never silently discards form input or an in-memory chat (task 4).
- API failures never become cached answers or automatic retries (task 3).
- Browser and installed app storage/sharing differences are verified on real target devices (task 5).

## Task 1: Establish the preservation baseline

**Files:** Inspect `index.html`, `cloud-account.js`, `cloud-store.js`, `support-chat.js`, `support-chat.css`, `api/chat.js`, `api/help-content.js`, `assets/`, and existing tests. Create `docs/pwa-release-checklist.md`.

- [ ] Record a regression checklist covering every feature above, including logout versus reset, garden reward calculations, and PNG generation.
- [ ] Create a synthetic saved-progress fixture for upgrade tests; do not use real wellness records.
- [ ] Record baseline behavior for a browser tab and standalone-sized viewport, including forms and mobile navigation.
- [ ] Run `node --test tests/chat.test.js`; resolve or record baseline failures before implementation.

## Task 2: Add installation metadata

**Files:** Create `manifest.webmanifest`, `pwa.js`, `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `assets/icons/maskable-512.png`, and `assets/icons/apple-touch-icon.png`. Modify `index.html`; create `tests/pwa.test.js`.

- [ ] Add manifest checks for stable `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, app name, colors, and valid referenced icons. These paths assume the current root deployment.
- [ ] Produce icons from the existing brand assets, with safe maskable padding.
- [ ] Link the manifest and Apple touch icon; load `pwa.js` without changing app state initialization.
- [ ] Implement `registerPwa()` in `pwa.js`: feature-detect service workers and register `/sw.js` only over HTTPS or localhost. Registration failures must not block the app.
- [ ] Provide optional installation guidance appropriate to the detected platform; never depend on a universal install prompt.
- [ ] Verify manifest delivery and supported installation on an HTTPS preview, plus ordinary use with service workers unavailable.

## Task 3: Add controlled offline loading

**Files:** Create `sw.js`; extend `tests/pwa.test.js`; modify `support-chat.js` for a connection-specific failure message.

- [ ] Test that only allowlisted same-origin public GET assets are cached, and that `/api/*`, POSTs, errors, Supabase/CDN/OAuth traffic, and every cross-origin request bypass the cache.
- [ ] Precache a complete release under a name such as `mindrise-shell-v1`, including the HTML, support files, PWA bootstrap, and local assets needed by all features.
- [ ] Use the active release's cached shell consistently. Only map in-scope app navigations to its HTML; never return HTML for failed API or asset requests.
- [ ] Fail installation of an incomplete release and keep the previous active worker and cache. Never cache secrets or private responses.
- [ ] Show a clear offline/unavailable chat state without persisting questions or automatically resending them. Treat actual request failures as authoritative; a connectivity indicator alone is insufficient.
- [ ] Test offline reload after caching, local-demo edits plus restart, warm signed-in account locking, cold offline launch into the demo, PNG generation, failed first-time caching, and reconnection with an explicit chat retry.

## Task 4: Make updates safe

**Files:** Modify `pwa.js`, `sw.js`, and `index.html`; create `vercel.json` for narrowly scoped cache headers if deployment inspection confirms it is needed; extend `tests/pwa.test.js`.

- [ ] Detect a waiting worker and offer “Update available” with a deferred reload option. Do not force activation/reload during active use.
- [ ] Explain that reloading closes the current chat and may discard unsaved input; preserve all already-saved progress.
- [ ] On explicit update acceptance, message the waiting worker with `{ type: "SKIP_WAITING" }`; reload once on controller change. Coordinate multiple open windows so another window's unsaved work is not silently discarded.
- [ ] Keep release asset versions coherent during deployment and activation. Clean only obsolete MindRise shell caches when they are no longer needed; never clear localStorage or unrelated caches.
- [ ] Ensure `/sw.js` can be revalidated and is not served with a long immutable lifetime. Keep its URL stable and version its contents/cache names per release.
- [ ] Exercise release A to B, interrupted B installation, two open windows, storage failure, and rollback. Compare the synthetic stored progress before and after each successful upgrade.
- [ ] Document rollback as a new worker release at the same URL that restores known-good assets. Deleting the worker file alone does not remove installed workers.

## Task 5: Verify and explain the release

**Files:** Update `README.md`, `api/help-content.js`, relevant guide copy in `index.html`, and `docs/pwa-release-checklist.md`.

- [ ] Run `node --test tests/chat.test.js tests/pwa.test.js` and record actual results. Browser tests must supplement mocked worker tests.
- [ ] Test Android Chrome, iPhone/iPad Safari home-screen installation, and desktop Chrome/Edge. Verify ordinary browser fallback separately; record exact tested versions.
- [ ] Check cold launch, offline relaunch, safe areas, keyboard/form layout, navigation without browser controls, focus/accessibility, sharing/downloads, and updates.
- [ ] Verify existing browser progress versus installed-app progress on each platform. iOS Home Screen apps may use separate browser storage, so verify that signing in inside the installed app loads the same Supabase account progress; never promise transfer of anonymous demo storage.
- [ ] Verify site-data deletion, uninstall/reinstall behavior, and storage-pressure failure handling. Never recommend clearing site data as a routine update fix.
- [ ] Update public help to explain installation, offline limits, account synchronization, demo-only local progress, update reloads, and unchanged reminder behavior.
- [ ] Release through preview first, then a small device pilot, then production only after preservation and update checks pass. Report failures without logging wellness content.

## What developers must keep in mind

Caching introduces a second release lifecycle: deployed code and users' active code may differ. Keep backend responses compatible with older clients. Service workers can affect ordinary website visitors too, even without installation. Development should use localhost/HTTPS, not file URLs, for PWA testing. Keep app-file caches separate from personal progress, and never expose server environment secrets in a cache list.

Installing does not itself provide synchronization, encryption, backup, or reliable always-running background execution. Supabase accounts already provide online cross-device progress; this PWA must not invent an offline account queue or weaken the existing revision-conflict protection. Multiple demo windows can still expose localStorage last-write-wins behavior.

## What users must keep in mind

- Installation is optional and differs by browser/device.
- Initial setup needs internet; cached local features can subsequently work offline.
- Support chat and downloading updates need internet.
- Account progress synchronizes through Supabase while online. An open account session pauses editing after disconnecting; a cold offline launch opens the local demo because cloud configuration and account data are intentionally not cached.
- Demo progress remains local. Changing browser/device/domain or opening an isolated installed-app storage container may show a separate demo; sign in to load account progress.
- Updates may ask for a reload; save input first. Chat continues to reset on reload as it does today.
- Existing in-app reminders do not become push notifications or reliable alarms while the app is closed.

## Sources checked on 2026-10-27

- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [web.dev: Service workers](https://web.dev/learn/pwa/service-workers)
- [web.dev: Updates](https://web.dev/learn/pwa/update)
- [web.dev: Assets and data](https://web.dev/learn/pwa/assets-and-data)
