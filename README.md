<div align="center">

# 🎓 Learnio

### Your all-in-one learning ecosystem for students

**[🚀 Live Demo](https://cmatt11.github.io/learnio/)** · Notes · Flashcards · PDF Lessons · Planner · Pomodoro

![Tech](https://img.shields.io/badge/JavaScript-vanilla%20ES%20modules-f7df1e)
![Styling](https://img.shields.io/badge/Tailwind%20CSS-CDN-38bdf8)
![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8)
![Android](https://img.shields.io/badge/Android-APK%20via%20Capacitor-3ddc84)
![No build](https://img.shields.io/badge/build%20step-none-success)

</div>

---

Learnio brings together everything a high‑school or college student needs to study smarter — notes, spaced‑repetition flashcards, PDF‑powered lessons, tasks, a class schedule, a smart study planner, a pomodoro timer, and progress analytics — in a single fast, offline‑capable web app that installs to your phone. **All data stays on your device.**

> 🔗 **Live demo:** https://cmatt11.github.io/learnio/
> 📱 Installs as a PWA on any phone, or as a native Android APK.

## ✨ Features

- **📊 Dashboard** — today's tasks, classes, due flashcards, study streak and a weekly study chart
- **📚 Subjects** — organize everything by class with custom colors
- **📝 Notes** — markdown editor with live preview, per‑subject organization, instant search
- **🃏 Flashcards** — build decks and study with **SM‑2 spaced repetition** (Again / Hard / Good / Easy)
- **📄 Lessons** — import a **PDF** (or paste text) and Learnio generates a **summary**, answers your **questions**, and builds an auto‑graded **quiz** — with **Casual / Normal / Hard** difficulty. Runs entirely on‑device.
- **✅ Tasks** — assignments with due dates, priority and subject tags, grouped by Overdue / Today / This week / Later
- **🗓️ Schedule** — weekly timetable with click‑to‑add, color‑coded by subject
- **🧠 Smart Planner** — turns your tasks into an optimized day/week study plan with break scheduling
- **⏱️ Pomodoro** — focus timer with custom intervals, auto break cycling, and study‑session logging
- **📈 Stats** — 30‑day study heatmap, time‑by‑subject breakdown, streaks
- **🌙 Dark mode** — light / dark / system
- **🔒 Local‑first & offline** — all data lives in your browser/device; export & import as JSON anytime

## 🛠️ Tech highlights

- **100% vanilla JavaScript** (ES modules) — a complete SPA with **no framework and no build step**
- Custom **hash router**, **reactive state store**, and a small **markdown renderer**, all hand‑built
- **Tailwind CSS** for styling
- **PWA**: web manifest + **service worker** for offline use and installability
- **PDF text extraction** in‑browser (pdf.js) plus an **on‑device summarizer, quiz generator, and TF‑IDF question‑answering engine** — no server, no API key
- **IndexedDB** for storing original PDFs; **localStorage** for app data
- Packaged to a native **Android APK** with **Capacitor**, with a **GitHub Actions** workflow to build it in CI

## 📸 Screenshots

> _Add a few screenshots here to make the repo pop._ Drop images into a `screenshots/` folder and reference them, e.g.:
>
> ```markdown
> ![Dashboard](screenshots/dashboard.png)
> ![Lessons](screenshots/lessons.png)
> ```

## ▶️ Run locally

It's a static site — just serve the folder over HTTP:

```bash
# Node
npx serve .

# or Python
python3 -m http.server 8000
```

Then open the printed `http://localhost:…` URL.

> Opening `index.html` directly via `file://` won't work — ES modules need an HTTP origin.

## 🌐 Live demo / deploy

Hosted free on **GitHub Pages**: **https://cmatt11.github.io/learnio/**

To enable it on your own fork: **Settings → Pages → Deploy from a branch → `main` / root**. It also deploys cleanly to Vercel, Netlify, or any static host (the app uses relative paths).

## 📱 Install as an app

Learnio is an installable **PWA** and can be packaged as a native **Android APK**.

- **Android (Chrome):** menu ⋮ → **Install app**, or **Settings → Install Learnio** in‑app
- **iPhone/iPad (Safari):** **Share** → **Add to Home Screen**
- **Desktop (Chrome/Edge):** click the install icon in the address bar

For a real `.apk`, the `mobile/` folder wraps the app with [Capacitor](https://capacitorjs.com/). See **[BUILD_APK.md](BUILD_APK.md)** for a step‑by‑step build guide, or **[`mobile/README.md`](mobile/README.md)**.

## 🗺️ Roadmap

- Optional "bring your own API key" mode for generative AI summaries/answers
- Cloud sync and multi‑device support
- Auto‑generate flashcards from a lesson PDF
- LaTeX / math equation rendering in notes
- Fully bundled Tailwind for 100%‑offline‑from‑first‑launch
- Grade tracker / GPA calculator

## 📦 Project structure

```
index.html            App shell
css/app.css           Styles (complements Tailwind)
js/
  main.js             Entry, routing, PWA registration
  router.js           Hash router
  state.js            Reactive store + localStorage persistence
  lessons-engine.js   PDF extraction + summary/quiz/Q&A engine
  lib/idb.js          IndexedDB helper (stores PDFs)
  components/         Layout, icons, modal
  views/              Dashboard, Notes, Flashcards, Lessons, Tasks,
                      Schedule, Planner, Pomodoro, Stats, Settings, Subjects
mobile/               Capacitor Android wrapper + build scripts
service-worker.js     Offline caching
```

## 📄 License

MIT — free to use and learn from.

---

<div align="center">
Built with vanilla JS, a lot of curiosity, and ☕
</div>
