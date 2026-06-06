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

## Roadmap (v2 ideas)

- Cloud sync (Supabase) and multi-device support
- AI features: auto-flashcards from notes, summaries, Q&A tutor
- LaTeX/math equation rendering in notes
- Mobile PWA install
- Collaboration: shared decks and study groups
- Calendar integration
- Grade tracker / GPA calculator

## License

MIT
