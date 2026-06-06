# Learnio

> Your all-in-one learning ecosystem for high school and college students.

Learnio brings together everything you need to study smarter — notes, flashcards with spaced repetition, tasks, schedule, a pomodoro timer, and progress tracking — in a single fast, beautiful, **zero-install** web app.

## Features

- **Dashboard** — at-a-glance view of today's tasks, classes, due flashcards, study streak and weekly chart
- **Subjects** — organize everything by class with custom colors
- **Notes** — markdown editor with live preview, organized by subject, instant search
- **Flashcards** — create decks and study with **SM-2 spaced repetition** (Again / Hard / Good / Easy)
- **Tasks** — assignments and to-dos with due dates, priority, subject tags, grouped by Overdue / Today / This week / Later
- **Schedule** — weekly timetable with click-to-add, color-coded by subject
- **Pomodoro** — focus timer with customizable intervals, automatic break cycling, and study session logging
- **Stats** — 30-day study heatmap, time-by-subject breakdown, streaks
- **Dark mode** — light / dark / system
- **Local-first** — all data stored in your browser via `localStorage`. Export/import as JSON anytime.

## Tech

- 100% **vanilla JavaScript** (ES modules) — no build step, no dependencies
- **Tailwind CSS** via CDN for styling
- Hash-based router, custom reactive state, simple markdown renderer
- Works offline once loaded

## Run locally

Just serve the folder over HTTP:

```bash
# Python
python3 -m http.server 8000

# Or Node
npx serve .
```

Then open http://localhost:8000.

> Note: opening `index.html` directly via `file://` won't work because ES modules require an HTTP origin.

## Deploy

This is a fully static site, deploy to anywhere:

- **GitHub Pages** — Settings → Pages → Deploy from `main` branch / root
- **Vercel** / **Netlify** — drag-and-drop or connect the repo
- **Any static host** — just upload the files

## Install as an app

Learnio is a **PWA (Progressive Web App)** and can also be packaged as a native **Android APK**.

### On your phone / desktop (PWA — no build needed)

Open the deployed site and install it:

- **Android (Chrome):** open the menu (⋮) → **Add to Home screen / Install app**, or use **Settings → Install Learnio** inside the app.
- **iPhone/iPad (Safari):** tap **Share** → **Add to Home Screen**.
- **Desktop (Chrome/Edge):** click the install icon in the address bar.

Once installed it launches full-screen, works **offline**, and stores all data locally on your device.

### As an Android APK (Capacitor)

The `mobile/` folder wraps the app with [Capacitor](https://capacitorjs.com/) to produce a real `.apk` that bundles everything for full offline use. The easiest way is the included GitHub Actions workflow:

1. GitHub repo → **Actions** tab → **Build Android APK** → **Run workflow**
2. Download the **learnio-debug-apk** artifact when it finishes
3. Install `app-debug.apk` on your phone

See [`mobile/README.md`](mobile/README.md) for local build instructions.

## Roadmap (v2 ideas)

- Cloud sync (Supabase) and multi-device support
- AI features: auto-flashcards from notes, summaries, Q&A tutor
- LaTeX/math equation rendering in notes
- Bundle Tailwind locally for 100%-offline-from-first-launch
- Collaboration: shared decks and study groups
- Calendar integration
- Grade tracker / GPA calculator

## License

MIT
