# Verification results

Checked on 7 October 2026.

## Automated logic tests

`npm test`: **7 passed**.

- India midnight correctly changes the date.
- Monday–Sunday weeks work on Sundays and across year boundaries.
- Monthly calendars align to weekdays and include leap-year dates.
- No targets means no star; ordinary tasks do not block target completion.
- Streaks allow an unfinished current day and stop at a missed completed day.
- Quotes remain stable within a date and change the next day.
- Backups reject invalid dates, duplicate IDs, unrecognised kinds and incorrect week starts, and discard foreign account identity.

## Production bundle

`npm run build`: **passed**. React, cloud client and application code are split into separate bundles. No project credentials were supplied in the build.

## Browser workflow and layout

Headless Chromium checks: **passed**.

- Added a daily target and earned its star.
- Unchecked and rechecked it; the balance did not increase again.
- Added a numeric weekly target and incremented it to completion; earned 5 stars.
- Rejected a schedule with an end time earlier than its start, then accepted valid times.
- Created a note and verified it and the star balance survived reload in demo mode.
- Verified all 10 syllabus sections and changed a completion checkbox.
- Checked widths of 1280, 768, 390 and 320 pixels for horizontal overflow.
- No JavaScript page errors were recorded.
- Desktop and phone screenshots were visually inspected; see `docs/previews/`.

`npm run test:ui` reproduces the local-demo browser checks after installing Playwright's Chromium. It starts its own dev server on port 5173, so close an existing server there first.

## Cloud client checks with simulated responses

Headless browser checks with a mocked Supabase HTTP service: **passed**.

- Email/password sign-in renders the account's tracker.
- A new task is sent as a separate authenticated entry.
- A second browser page fetches that entry and updates its completion.
- The original page refreshes and sees both completion and the earned star.
- A failed save shows an error and preserves the open draft.

These checks exercise the client's cloud request flow. They **do not prove** a live Supabase deployment works or that database security policies are correct. `npm run test:cloud` reproduces the simulated check.

## Requires your own Supabase project

The live database schema, authenticated SQL execution, account isolation, signup email delivery, password-reset email links and actual phone/laptop cloud access have **not** been tested against a real project because this deliverable does not contain your account or credentials.

After setup, verify:

1. Sign up and confirm the email if confirmation is enabled.
2. Add tasks and notes; refresh and confirm they remain.
3. Sign into the same account on another device and confirm the same records appear.
4. Change a task on one device and refresh the other.
5. Use a second test account; it must not see the first account's entries.
6. Repeatedly toggle one completed target; only one daily reward should exist.
7. Test forgot-password from the deployed URL and confirm the link opens that URL.

`supabase/verify-security.sql` provides supporting inspection queries. Only the project's publishable/anon key should be in the frontend; never a service-role/secret key.
