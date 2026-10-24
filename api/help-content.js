// Public prototype facts only. Keep this separate from the private project charter.
module.exports = `MindRise help for the current responsive browser prototype (not a native mobile app).

Getting in: On the homepage, Get Started opens a demo profile form. Log In opens the demo login form. Explore the demo enters directly with sample data. These are presentation flows, not real accounts. There is no cloud sync. Your progress stays in this browser's localStorage and may disappear if browser data is cleared. The support chat itself lasts only until refresh.

Support: The homepage Support button reveals a floating bubble and opens the chat. The bubble toggles the panel; the panel close button and Escape collapse the panel while leaving the bubble. The small x next to the bubble hides both until Support is used again. The bubble can be dragged or moved with arrow keys while focused. Conversation and position remain in this page only and reset on refresh. The bubble stays available in the demo and login screens until hidden.

Navigation: The demo has Overview, My Garden, Track, Tasks, Rewards, and Profile. On narrow screens the app uses bottom navigation. Overview summarizes the latest sleep, mood, energy, today's tasks, activity streak, and garden progress.

Sleep: In Track, choose Sleep tracker and enter a bedtime and wake-up time manually. The app calculates duration and shows a week or month chart and average. Saving a date again updates that day's log. It does not monitor sleep automatically or connect to a device. The eight-hour marker is a personal goal display, not a diagnosis.

Mood and energy: In Track, choose Mood & energy. Pick one of five moods, rate energy from 1 to 5, optionally write a short note, then save or update today's check-in. The five latest entries appear below. The app does not diagnose a condition or provide counseling.

Tasks and classes: In Tasks, choose the "Add task" button, enter a task name, date, time, and category (Academic, Wellness, or Personal), then choose "Add task" in the form. Home also has an "Add task" button. To edit, use the arrow button on that task's row, change the fields, and choose "Save changes". The same form has "Delete task". Use the task's checkbox to mark it complete. Switch day or week views and navigate weeks. Add a recurring class with days, start and end times, and optional room. The app shows class overlaps but allows saving them; it does not fix your timetable automatically. Classes are separate from tasks and do not earn task rewards. In-app task reminders can be switched in Profile; there are no push notifications.

Rewards and Garden: Qualifying sleep logs and today's completed tasks award Mind Gems and XP, with activity-streak bonuses. Mood check-ins count toward activity streaks. Rewards shows milestones and themes. In My Garden, plant an owned seed in the Nursery. A newly rewarded sleep log or completed task for today helps the plant grow once that day. After seven active days it moves into the Garden; missed days do not reset growth. Spend Mind Gems on seeds, pots, tags, and backgrounds. You can customize plants and the shared Garden backdrop. Plant and Garden PNG cards can be downloaded; device sharing depends on browser support.

Profile: Edit your display name, school, and optional email; choose app themes; enable Calm mode to reduce motion; turn in-app task reminders on or off; open the demo guide; log out to the homepage; or reset the presentation to sample data. Profile fields are browser-local and must never be requested by this helper.

Limits: This is a prototype, not a medical tool. There are no real accounts, backups, automatic sleep monitoring, automatic schedule repair, diagnostic mechanisms, device integrations, or push notifications. If a feature detail is not covered here, say you are unsure. Answer only questions about setting up or using MindRise.`;
