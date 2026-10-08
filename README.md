# PrepBloom 🌸

A personal study tracker for GATE CSE preparation. Plan your studies, track your progress and earn stars for completing your targets.

## Live App

**[Open PrepBloom](https://prepbloom.vercel.app)**

Create an account to save your progress and access it on your phone and laptop.

## Demo Recording

**[Watch or download the PrepBloom demo](docs/PrepBloom_recording.mov)**

## Features

- **Daily tasks:** Add your own study tasks and mark them complete.
- **Weekly targets:** Set weekly goals and track your progress.
- **Study schedule:** Plan sessions with subjects, dates and times.
- **Calendar:** View your study plans by date.
- **CSE syllabus:** Track completed topics from the GATE CSE syllabus.
- **Notes:** Save revision notes and important concepts.
- **Star rewards:** Earn golden stars for completing daily and weekly targets.
- **Daily motivation:** See a motivational quote each day.
- **Cloud sync:** Access your saved progress across devices using the same account.
- **Responsive design:** Use the app on desktop and mobile browsers.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| Vite | Development and production builds |
| Supabase | Authentication and database |
| Lucide React | Icons |
| CSS | Styling and responsive layouts |
| Vercel | Hosting |

## Run Locally

### 1. Download the project

Requires Node.js 22 or newer.

```bash
git clone https://github.com/Pankhuri510/prepbloom.git
cd prepbloom
npm install
```

### 2. Configure Supabase

Create your own project at https://supabase.com.

Run the contents of `supabase/schema.sql` in your Supabase project's SQL Editor. This creates the database tables, user access policies and reward functions.

Create a file named `.env.local` in the project root, beside `package.json`, and add:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholders with your project's URL and publishable key.

In Supabase, go to **Authentication → URL Configuration** and add `http://localhost:5173/` to the allowed Redirect URLs.

Without Supabase configuration, you can explore the app in demo mode. Demo progress is stored in the current browser and does not sync across devices.

### 3. Start the app

```bash
npm run dev
```

Open the local URL shown in your terminal.

## Production Build

```bash
npm run build
```

The production files are generated in the `dist` folder.

For deployment, configure both Supabase environment variables on your hosting platform before building. Set your Supabase Site URL to your deployed app's address and add it to the allowed Redirect URLs.

## Account and Data

Each signed-in user has their own tasks, targets, schedule, notes and syllabus progress.

Supabase row-level security restricts database access to the account that owns the data.

Local environment files, credentials and generated build files are excluded from this repository.

## Project Structure

- `src/` — App interface, styling and tracker logic
- `public/` — Static assets
- `supabase/` — Database schema and security verification SQL
- `tests/` — Automated checks
- `docs/` — Demo recording and screenshots
- `.env.example` — Example environment configuration

## About

Created by [Pankhuri](https://github.com/Pankhuri510) for her GATE CSE preparation.