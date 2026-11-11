# MindRise

A student wellness web app for building healthier habits through daily planning, check-ins, and a collectible virtual garden.

## Run locally

Serve the repository through HTTP localhost or deploy it over HTTPS, then choose **Explore the demo**. PWA installation and offline caching do not work from a `file://` URL. Optional cloud accounts load a pinned Supabase browser SDK. The support bubble appears after choosing **Support** on the homepage; answers require a Vercel deployment or `vercel dev` because a file opened directly cannot call `/api/chat`.

Keep the `assets/` directory alongside the HTML file. The homepage includes **About Us** and **How It Works** panels; **Log In** and **Get Started** use the existing demo profile flow. On phones, open **Menu** to find these controls and **Support**. Select a nav panel again, click outside, use its close button, or press Escape to collapse it. Support opens a separate floating chat; its bubble toggles the chat and its x badge hides the bubble.

## Features

- Dashboard with sleep, mood, energy, tasks, and activity streaks.
- Manual sleep logs and charts, daily mood and energy check-ins, and optional journal notes.
- Task creation, editing, completion, and today/week views.
- Mind Gems and XP from qualifying sleep logs and daily tasks, with streak bonuses.
- Nursery plants that mature over seven active days, a shared garden, and a customization shop.
- App themes, independent garden backdrops, and downloadable plant/garden PNG share cards.
- Profile settings, reduced-motion mode, and demo reset.
- Optional PWA installation with offline relaunch for the public app shell and local demo.

## Optional accounts and cloud saves

Google sign-in and private per-account cloud saves are implemented but disabled until `cloud-config.js` is configured. Follow [the setup guide](docs/cloud-setup.md) to create a Free Supabase project, run the SQL migration, configure Google OAuth, and add the public project URL and publishable key. No secret keys belong in the frontend.

Account mode uses one revision-checked JSON record per user, explicit browser-progress import, save/error/conflict status, retry, backup download, and sign-out. Account progress never overwrites the original demo key. Internet is required to edit account progress. Unsynced changes remain in memory and can be lost if the page closes; download a backup or finish saving first. Rewards remain client-calculated for this prototype.

## Structure and storage

The main app's HTML, CSS, vanilla JavaScript, and in-app SVG artwork live in `index.html`. `support-chat.css` and `support-chat.js` provide the chat UI; `api/chat.js` is the Vercel function, importing the public `api/help-content.js` and the owner-supplied `api/crisis-response.js`. The homepage uses optimized local brand images in `assets/`. Screens are rendered from JavaScript functions with shared state and event handlers.

Demo progress is saved in the browser's `localStorage` under `mindrise-prototype-v1`. It is not embedded in the HTML file or synced between devices. Clearing browser data can erase progress. **Profile → Reset presentation** restores the demo defaults.

## Installable PWA and offline behavior

On supported browsers, use **Install app** on the homepage or **Profile → Install MindRise**. On iPhone or iPad, MindRise explains how to use Safari's **Share → Add to Home Screen** flow. The web manifest, service worker, and versioned public-shell cache make the app launchable after one successful online visit.

Only public interface files are cached. Supabase, Google OAuth, `cloud-config.js`, the support API, and account responses stay network-only. The local demo can be used offline. If an already-open signed-in session loses connectivity, account editing pauses so the revision-checked save workflow cannot silently create conflicts. A cold offline launch cannot load the cloud configuration or account, so it opens the local demo; reconnect and reload before working with account progress. An installed iOS app can have storage separate from its Safari tab, so sign in once inside the installed app to load the same Supabase account progress. Demo progress is not transferred automatically.

Updates download as a complete shell and wait. MindRise shows an update notice and reloads only after the user chooses **Update now**. `vercel.json` requires revalidation of `sw.js` so deployments can be discovered without caching the worker indefinitely. The automated PWA test hashes every cached file and fails when `SHELL_REVISION` has not been updated, preventing a changed shell from silently reusing the active cache.

The homepage Support button and the app top bar Support button open the same chat. Its visibility, position, and conversation remain in page memory only. Closing or dismissing the bubble keeps the conversation until refresh, including when entering the demo. The function has no database or sessions. For recognized feature topics, it sends the screened wording of the current question and prior user questions to AI Gateway; it never reads browser storage or profile state. Obvious personal details are blocked or removed, but automated screening can miss details, so users should not type personal or sensitive information.

## Support chat deployment

Set `AI_GATEWAY_API_KEY` in Vercel's **Preview** environment for preview tests and **Production** before releasing the feature. Redeploy after changing environment variables. The server route uses `openai/gpt-4.1-nano`, permits only Azure as provider, and requests `disallowPromptTraining: true` for every call. If no compliant provider is available, the helper displays an unavailable message. The key stays server-side. `CHAT_ALLOWED_ORIGINS` can add a comma-separated list of future first-party origins; the production domain and current Vercel Preview deployment are allowed by default. Origin checks discourage casual cross-site use but are not authentication.

AI Gateway may require the Vercel team to verify a valid payment method before its monthly free credits can be used. A runtime log of `gateway-http-403 type=customer_verification_required` means Gateway blocked inference at that verification step; complete it in the Vercel team's AI Gateway/Billing settings, keep auto top-up off if you want the free-credit limit as the cost backstop, and retry. The function's error logs contain only failure categories and status codes, never prompts or keys.

Run the dependency-free server checks with `node --test tests/chat.test.js`. Review the bilingual Philippines-specific crisis copy and its hotline details before a production release. The deterministic crisis check runs before the model; it is keyword-based and cannot identify every possible crisis phrasing.

## Current scope

The app starts with sample history. Without cloud configuration, login/signup are demo flows. With configuration, email/password and Google accounts sync progress and offer manual JSON backup downloads. There are no automatic backup guarantees, health-device integrations, push notifications, or native app-store packages. MindRise is an installable PWA; sharing capabilities depend on browser support.

## Homepage content and review

Purpose, objectives, and team background are adapted from the project charter. The team list includes the requested correction to Benedict Lachica. The shared team motivation is draft editorial copy for review. How It Works describes the implemented prototype's behavior, including garden rewards and its storage limitations. No individual biographies or testimonials are invented.

See `docs/homepage-review.md` for the scoped audit and verification record. The private charter is not included in this repository.

## Cloud-save checks

Run `node --test tests/*.test.js`. Run `node tests/pwa-browser.cjs` with installed Chrome for real service-worker, offline-relaunch, cache-boundary, and iOS-guidance checks. Optional account browser checks run with `node tests/cloud-browser.cjs` using Playwright and installed Chrome. Those simulate the provider; real Google sign-in and two-user SQL/RLS checks in [the setup guide](docs/cloud-setup.md) are required before releasing cloud accounts. See [the PWA release checklist](docs/pwa-release-checklist.md) for device testing.
