# Homepage review

## Scope and sources

The public welcome screen gains a responsive navbar and two mutually exclusive expanding panels. Existing signup, login, and demo actions remain intact. The auth Back control now says Back to home. Implementation remains plain HTML, CSS and JavaScript.

- Charter: student purpose, routine/sleep/mood/energy objectives, FEU context, Group Tree and team background.
- User correction: Benedict Lachica replaces Andrea Louise Tulaylay.
- Editorial draft: the shared team motivation paragraph and warm feature introductions. No individual bios, unsupported roles, statistics, testimonials or clinical claims.
- Code: dashboard, manual sleep logs and charts, mood/energy/journal, task CRUD and views, streaks and badges, exact Gems/XP rules, Nursery growth and Garden collection, Shop/customization, app themes, PNG exports/device share support, profile settings, in-app reminders, Calm mode, help, logout/reset and storage limitations.

The private charter was read in place and is neither copied nor linked here.

## Brand exports

Three compressed WebP images, approximately 23 KB total, derived only from supplied PNGs:

- `assets/mindrise-logo.webp`: horizontal logo, 5,942 bytes.
- `assets/mindrise-emblem.webp`: emblem without text, 7,628 bytes.
- `assets/homepage-background.webp`: horizontal leafy brand background, 9,334 bytes.

Original colors and lettering are retained. Homepage CSS reuses the existing cream, sage, dark green, plum, sans-serif stack and Georgia. Saved demo themes remain independent of the public homepage.

## Impeccable audit

Manual application of the Impeccable audit playbook with live Chromium measurements, screenshots and a fresh code review. The bundled Impeccable engine was unavailable, so its automated detector was not run. This is a scoped implementation assessment, not a full WCAG certification or a cross-browser certification.

Findings were reported to the user before correction:

| Finding | Impact | Resolution |
| --- | --- | --- |
| P1: saved theme overrides | Supplied art was replaced; dark theme text lost contrast | Homepage-specific CSS wins without changing demo themes |
| P1: Gamer button contrast | White text over a pale inherited gradient | Scoped solid dark-green buttons; measured contrast 7.40:1 |
| P2: reduced-motion fixed panel height | Expanded reward details clipped without transitionend | Use automatic height when motion is disabled; also handle transition cancellation |
| P2: responsive focus restoration | Escape after resizing could leave focus in inert content | Fall back to the visible Menu button; handle focus loss when nav becomes hidden |

The last keyboard regression also reproduced browser-cleared focus during resize; the focusout handler now restores a visible target.

| Dimension | Score / 4 | Evidence and limits |
| --- | --- | --- |
| Accessibility | 3 | ARIA states, inert closed panels, keyboard checks, focus restoration and measured main-text contrast; no screen-reader certification |
| Performance | 3 | Three small images, no added dependencies, bounded 300 ms transition; height animation intentionally performs layout |
| Responsive design | 4 | 375, 768 and 1440 px, no horizontal overflow; phone menu and long content remain usable |
| Theming | 4 | Homepage appearance verified with all eight saved demo themes |
| Implementation integrity | 4 | Existing actions reused, content checked against code, local source assets, no external scripts |
| Total | 18 / 20 | No unresolved blocking findings in the tested scope |

## Verification

Browser checks used the existing bundled Playwright library with installed Chrome, without installing dependencies or adding a test framework. Harnesses and screenshots were kept outside the public repository.

- Before implementation: navbar check failed because the feature was absent.
- At 375, 768 and 1440 px: panel opening/switching/repeat closure, outside-click closure, Escape/focus, auth-only rendering, signup submission, both signup entry points, demo entry, no horizontal overflow, reduced-motion CSS.
- Edge cases: Tab and Enter, rapid reversals, Calm mode with expanded details, top link, login submission, desktop-to-phone focus, consecutive mobile Escape presses, unavailable localStorage, local image loading.
- Audit regressions: reduced-motion details fit their container, all eight themes preserve homepage assets/buttons, resize then Escape restores visible focus.
- Measured homepage contrast: plum links 5.46:1, body copy 6.06:1, dark-green primary buttons 7.40:1.
- Desktop, tablet, phone and login screenshots visually inspected. No browser JavaScript errors in checked flows.

Manual review: open `MindRise.html` with `assets/` alongside it. Check the two panels, the mobile menu, and the three entry flows. Shared team motivation remains draft copy for the team's review; there are no unfilled placeholders.
