# MindRise PWA release checklist

## Automated checks

- [ ] Run `node --test tests/*.test.js`.
- [ ] Run `node tests/pwa-browser.cjs` with Chrome installed.
- [ ] Run `node tests/cloud-browser.cjs` when Playwright is available.
- [ ] Confirm `sw.js` is served with `Cache-Control: public, max-age=0, must-revalidate`.
- [ ] Confirm `manifest.webmanifest` is served as `application/manifest+json`.

## Preview deployment

- [ ] Open the HTTPS preview once while online and confirm the service worker is active.
- [ ] Install from Chrome or Edge and launch from the operating-system app icon.
- [ ] Disconnect, close every MindRise window, and confirm the installed app relaunches to the public interface.
- [ ] In the local demo, add a harmless synthetic task offline, close and reopen, and confirm it remains on that device.
- [ ] Confirm support clearly reports that it is offline and does not send or queue the question.
- [ ] Sign in while online, disconnect, and confirm the open account session locks editing until reconnection.
- [ ] Cold-launch while offline and confirm MindRise opens the local demo; reconnect and reload before expecting account progress.
- [ ] Confirm Cache Storage contains only public shell files—not `cloud-config.js`, `/api/*`, Supabase, OAuth, sessions, or account payloads.

## Device checks

- [ ] Android Chrome: install prompt, icon, standalone launch, keyboard, scrolling, and offline relaunch.
- [ ] iPhone/iPad Safari: Share → Add to Home Screen, icon, safe areas, standalone launch, and a fresh sign-in if installed-app storage is separate.
- [ ] Desktop Chrome and Edge: installation, window sizing, update notice, and ordinary browser fallback.
- [ ] At 390 px width, check homepage menu, authentication forms, dashboard bottom navigation, Profile install row, support panel, and update notice.

## Account and update safety

- [ ] Sign in with the same test account on two devices and confirm the latest saved cloud progress loads on each after refresh.
- [ ] Verify Google OAuth returns to the installed app/site and email/password remains the primary account option.
- [ ] Run the PWA unit tests after every cached-file change; update `SHELL_REVISION` to the content hash reported by the failing test.
- [ ] Deploy that cache revision, confirm the old version stays usable until the new shell is complete, and accept **Update now** only after saving open input.
- [ ] Confirm an interrupted update leaves the prior cached release usable.
- [ ] Confirm signing out removes account progress from the page but does not delete the independent local demo.

Record actual device/browser versions and any failures before production release. Do not use real wellness entries in release testing.
