# MindRise authentication options

MindRise must present three account paths on its existing authentication page. Email and password is the primary path: **Get Started** creates an account and **Log In** signs into an existing account. Google is the secondary path and opens the provider flow in a separate browser popup; if the popup cannot be opened, the same flow falls back to a full-page redirect. The local demo remains available without authentication and remains separate from account progress.

Email sign-up stores the supplied display name as Supabase user metadata. If email confirmation is enabled, the page tells the user to check their inbox instead of pretending the account is already active. Email sign-in errors remain on the authentication page. Google keeps the existing PKCE configuration and exact return URL; the callback window notifies the opener, which loads the authenticated session and closes the popup.

Remove the visible `PRESENTATION PROTOTYPE` badge from the public homepage and the `PROTOTYPE` badge from the dashboard. Do not remove demo mode, sample data, or the safety copy explaining that local demo progress stays in the browser.

Approaches considered: a redundant MindRise modal before Google (rejected because it adds an unnecessary click); full-page Google redirect only (reliable but does not meet the requested popup behavior); popup with redirect fallback (selected for familiar desktop UX and resilience on blocked/mobile popups).
