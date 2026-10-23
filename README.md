# MindRise

A self-contained student wellness prototype for building healthier habits through daily planning, check-ins, and a collectible virtual garden.

## Run locally

Open `MindRise.html` in a modern browser and choose **Explore the demo**. No installation, build step, dependencies, or backend is required.

## Features

- Dashboard with sleep, mood, energy, tasks, and activity streaks.
- Manual sleep logs and charts, daily mood and energy check-ins, and optional journal notes.
- Task creation, editing, completion, and today/week views.
- Mind Gems and XP from qualifying sleep logs and daily tasks, with streak bonuses.
- Nursery plants that mature over seven active days, a shared garden, and a customization shop.
- App themes, independent garden backdrops, and downloadable plant/garden PNG share cards.
- Profile settings, reduced-motion mode, and demo reset.

## Structure and storage

All HTML, CSS, vanilla JavaScript, and SVG artwork live in `MindRise.html`. Screens are rendered from JavaScript functions with shared state and event handlers.

Progress is saved in the browser's `localStorage` under `mindrise-prototype-v1`. It is not embedded in the HTML file or synced between devices. Clearing browser data can erase progress. **Profile → Reset presentation** restores the demo defaults.

## Prototype scope

The app starts with sample history. Login/signup are demo flows; there are no real accounts, cloud backups, health-device integrations, or push notifications. It is not currently an installable PWA or native mobile app. Sharing capabilities depend on browser support.
