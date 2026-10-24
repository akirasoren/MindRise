# MindRise

A self-contained student wellness prototype for building healthier habits through daily planning, check-ins, and a collectible virtual garden.

## Run locally

Open `index.html` in a modern browser and choose **Explore the demo**. The prototype itself has no installation, build step, or dependencies. The support bubble appears after choosing **Support** on the homepage; answers require a Vercel deployment or `vercel dev` because a file opened directly cannot call `/api/chat`.

Keep the `assets/` directory alongside the HTML file. The homepage includes **About Us** and **How It Works** panels; **Log In** and **Get Started** use the existing demo profile flow. On phones, open **Menu** to find these controls and **Support**. Select a nav panel again, click outside, use its close button, or press Escape to collapse it. Support opens a separate floating chat; its bubble toggles the chat and its x badge hides the bubble.

## Features

- Dashboard with sleep, mood, energy, tasks, and activity streaks.
- Manual sleep logs and charts, daily mood and energy check-ins, and optional journal notes.
- Task creation, editing, completion, and today/week views.
- Mind Gems and XP from qualifying sleep logs and daily tasks, with streak bonuses.
- Nursery plants that mature over seven active days, a shared garden, and a customization shop.
- App themes, independent garden backdrops, and downloadable plant/garden PNG share cards.
- Profile settings, reduced-motion mode, and demo reset.

## Structure and storage

The main app's HTML, CSS, vanilla JavaScript, and in-app SVG artwork live in `index.html`. `support-chat.css` and `support-chat.js` provide the chat UI; `api/chat.js` is the Vercel function, importing the public `api/help-content.js` and the owner-supplied `api/crisis-response.js`. The homepage uses optimized local brand images in `assets/`. Screens are rendered from JavaScript functions with shared state and event handlers.

Progress is saved in the browser's `localStorage` under `mindrise-prototype-v1`. It is not embedded in the HTML file or synced between devices. Clearing browser data can erase progress. **Profile → Reset presentation** restores the demo defaults.

The chat's visibility, position, and conversation remain in page memory only. Closing or dismissing the bubble keeps the conversation until refresh. The function has no database or sessions, and sends only fixed, public feature questions to AI Gateway rather than raw chat text or app profile data.

## Support chat deployment

Set `AI_GATEWAY_API_KEY` in Vercel's **Preview** environment for preview tests and **Production** before releasing the feature. Redeploy after changing environment variables. The server route uses `openai/gpt-4.1-nano`, permits only Azure as provider, and requests `disallowPromptTraining: true` for every call. If no compliant provider is available, the helper displays an unavailable message. The key stays server-side. `CHAT_ALLOWED_ORIGINS` can add a comma-separated list of future first-party origins; the production domain and current Vercel Preview deployment are allowed by default. Origin checks discourage casual cross-site use but are not authentication.

AI Gateway may require the Vercel team to verify a valid payment method before its monthly free credits can be used. A runtime log of `gateway-http-403 type=customer_verification_required` means Gateway blocked inference at that verification step; complete it in the Vercel team's AI Gateway/Billing settings, keep auto top-up off if you want the free-credit limit as the cost backstop, and retry. The function's error logs contain only failure categories and status codes, never prompts or keys.

Run the dependency-free server checks with `node --test tests/chat.test.js`. Review the bilingual Philippines-specific crisis copy and its hotline details before a production release. The deterministic crisis check runs before the model; it is keyword-based and cannot identify every possible crisis phrasing.

## Prototype scope

The app starts with sample history. Login/signup are demo flows; there are no real accounts, cloud backups, health-device integrations, or push notifications. It is not currently an installable PWA or native mobile app. Sharing capabilities depend on browser support.

## Homepage content and review

Purpose, objectives, and team background are adapted from the project charter. The team list includes the requested correction to Benedict Lachica. The shared team motivation is draft editorial copy for review. How It Works describes the implemented prototype's behavior, including garden rewards and its storage limitations. No individual biographies or testimonials are invented.

See `docs/homepage-review.md` for the scoped audit and verification record. The private charter is not included in this repository.
