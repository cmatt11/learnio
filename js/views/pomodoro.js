// Pomodoro timer with study session logging

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { escapeHtml, uid, formatDuration, toast, today, ymd } from '../utils.js';
import { totalStudyMinutesInRange } from './_helpers.js';

export function renderPomodoro() {
  const state = getState();
  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`
  ).join('');

  const todayMins = totalStudyMinutesInRange(state.studySessions, today(), today());

  const recentSessions = [...state.studySessions]
    .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
    .slice(0, 6);

  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6">
      <div class="card p-8 text-center">
        <div class="flex justify-center gap-2 mb-6">
          <button class="mode-btn btn btn-ghost" data-mode="work">Focus</button>
          <button class="mode-btn btn btn-ghost" data-mode="shortBreak">Short break</button>
          <button class="mode-btn btn btn-ghost" data-mode="longBreak">Long break</button>
        </div>

        <div class="relative inline-block mb-6">
          <svg width="220" height="220" viewBox="0 0 220 220" class="ring-progress">
            <circle cx="110" cy="110" r="100" fill="none" stroke="currentColor" stroke-width="8" class="text-slate-200 dark:text-slate-800" />
            <circle id="progress-circle" cx="110" cy="110" r="100" fill="none" stroke="#6366f1" stroke-width="8" stroke-linecap="round"
                    stroke-dasharray="628.32" stroke-dashoffset="0" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div id="time-display" class="text-5xl font-bold tabular-nums">25:00</div>
            <div id="mode-label" class="text-xs uppercase tracking-wider text-slate-400 mt-1">Focus session</div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 mb-6">
          <button id="start-btn" class="btn btn-primary px-6">${icon('play', { size: 16 })} Start</button>
          <button id="reset-btn" class="btn btn-secondary">${icon('reset', { size: 16 })} Reset</button>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <select id="subject-select" class="select flex-1">${subjectOptions}</select>
          <input id="task-label" class="input flex-1" placeholder="What are you working on?" />
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-3">${icon('chart', { size: 18 })} Today</h3>
          <div class="text-3xl font-bold mb-1">${escapeHtml(formatDuration(todayMins))}</div>
          <p class="text-sm text-slate-500 dark:text-slate-400">studied today across ${state.studySessions.filter((s) => ymd(s.startedAt) === today()).length} sessions</p>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-3">${icon('settings', { size: 18 })} Settings</h3>
          <form id="settings-form" class="grid grid-cols-3 gap-2 text-sm">
            <label class="block">
              <span class="text-xs text-slate-500">Focus (min)</span>
              <input type="number" min="1" max="120" name="work" class="input mt-1" value="${state.settings.pomodoro.work}" />
            </label>
            <label class="block">
              <span class="text-xs text-slate-500">Short break</span>
              <input type="number" min="1" max="60" name="shortBreak" class="input mt-1" value="${state.settings.pomodoro.shortBreak}" />
            </label>
            <label class="block">
              <span class="text-xs text-slate-500">Long break</span>
              <input type="number" min="1" max="60" name="longBreak" class="input mt-1" value="${state.settings.pomodoro.longBreak}" />
            </label>
          </form>
        </div>
      </div>

      <div class="card p-5">
        <h3 class="font-semibold flex items-center gap-2 mb-3">${icon('clock', { size: 18 })} Recent sessions</h3>
        ${recentSessions.length === 0 ? `
          <div class="empty text-sm">No sessions yet. Start a focus session above.</div>
        ` : `
          <ul class="space-y-2">
            ${recentSessions.map((s) => {
              const subj = s.subjectId ? subjectById[s.subjectId] : null;
              const date = new Date(s.startedAt);
              return `
                <li class="flex items-center gap-3 text-sm">
                  <span class="w-2 h-2 rounded-full" style="background: ${escapeHtml(subj?.color || '#94a3b8')}"></span>
                  <span class="flex-1 truncate">${escapeHtml(s.label || subj?.name || 'Study session')}</span>
                  <span class="text-slate-500 text-xs">${escapeHtml(formatDuration(s.durationMinutes))}</span>
                  <span class="text-slate-400 text-xs">${escapeHtml(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</span>
                </li>
              `;
            }).join('')}
          </ul>
        `}
      </div>
    </div>
  `;

  return {
    title: 'Pomodoro',
    subtitle: 'Focus timer + study log',
    content,
    onMount: (root) => {
      const settings = getState().settings.pomodoro;
      const durations = { work: settings.work * 60, shortBreak: settings.shortBreak * 60, longBreak: settings.longBreak * 60 };
      let mode = 'work';
      let remaining = durations[mode];
      let timerId = null;
      let running = false;
      let sessionStartTime = null;
      let totalDuration = durations[mode];

      const display = root.querySelector('#time-display');
      const modeLabel = root.querySelector('#mode-label');
      const progressCircle = root.querySelector('#progress-circle');
      const startBtn = root.querySelector('#start-btn');
      const resetBtn = root.querySelector('#reset-btn');
      const subjectSelect = root.querySelector('#subject-select');
      const taskLabel = root.querySelector('#task-label');
      const modeBtns = root.querySelectorAll('.mode-btn');
      const settingsForm = root.querySelector('#settings-form');

      const CIRC = 2 * Math.PI * 100;

      const updateDisplay = () => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const offset = CIRC * (1 - remaining / totalDuration);
        progressCircle.setAttribute('stroke-dashoffset', String(offset));
        progressCircle.setAttribute('stroke', mode === 'work' ? '#6366f1' : (mode === 'shortBreak' ? '#10b981' : '#f59e0b'));
        modeLabel.textContent = mode === 'work' ? 'Focus session' : (mode === 'shortBreak' ? 'Short break' : 'Long break');
        // Update tab title
        document.title = `${display.textContent} - Learnio`;
      };

      const updateModeButtons = () => {
        modeBtns.forEach((b) => {
          b.classList.toggle('active', b.dataset.mode === mode);
          if (b.dataset.mode === mode) {
            b.classList.add('!bg-brand-100', 'dark:!bg-brand-900/40', 'text-brand-700', 'dark:text-brand-300');
          } else {
            b.classList.remove('!bg-brand-100', 'dark:!bg-brand-900/40', 'text-brand-700', 'dark:text-brand-300');
          }
        });
      };

      const setMode = (newMode) => {
        if (running) {
          // confirm via toast - just stop
          stop(false);
        }
        mode = newMode;
        totalDuration = durations[mode];
        remaining = durations[mode];
        updateDisplay();
        updateModeButtons();
      };

      const tick = () => {
        remaining -= 1;
        updateDisplay();
        if (remaining <= 0) {
          finish();
        }
      };

      const start = () => {
        if (running) return;
        running = true;
        sessionStartTime = new Date();
        startBtn.innerHTML = `${icon('pause', { size: 16 })} Pause`;
        startBtn.classList.add('pulse-soft');
        timerId = setInterval(tick, 1000);
      };

      const pause = () => {
        if (!running) return;
        running = false;
        clearInterval(timerId);
        timerId = null;
        startBtn.innerHTML = `${icon('play', { size: 16 })} Resume`;
        startBtn.classList.remove('pulse-soft');
      };

      const stop = (finished) => {
        if (timerId) clearInterval(timerId);
        timerId = null;
        running = false;
        startBtn.innerHTML = `${icon('play', { size: 16 })} Start`;
        startBtn.classList.remove('pulse-soft');
        // Log only focus (work) sessions
        if (mode === 'work' && sessionStartTime) {
          const elapsed = totalDuration - remaining;
          if (elapsed >= 60) {
            // Save session
            update((d) => {
              d.studySessions.push({
                id: uid('sess'),
                subjectId: subjectSelect.value || null,
                label: taskLabel.value.trim() || null,
                type: 'pomodoro',
                durationMinutes: Math.round(elapsed / 60),
                startedAt: sessionStartTime.toISOString(),
                endedAt: new Date().toISOString(),
              });
            });
            if (finished) toast(`Logged ${Math.round(elapsed / 60)} min — nice work!`, { type: 'success' });
          }
        }
        sessionStartTime = null;
      };

      const finish = () => {
        stop(true);
        // Play notification sound
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = mode === 'work' ? 440 : 660;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          o.start();
          o.stop(ctx.currentTime + 0.6);
        } catch (e) {}
        if (mode === 'work') {
          toast('Great focus session! Time for a break.', { type: 'success' });
          setMode('shortBreak');
        } else {
          toast('Break over — back to it!');
          setMode('work');
        }
      };

      const reset = () => {
        if (running) stop(false);
        remaining = durations[mode];
        updateDisplay();
      };

      startBtn.addEventListener('click', () => running ? pause() : start());
      resetBtn.addEventListener('click', reset);
      modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

      // Live-update settings
      settingsForm.addEventListener('input', () => {
        const fd = new FormData(settingsForm);
        const newSettings = {
          work: Math.max(1, Number(fd.get('work')) || 25),
          shortBreak: Math.max(1, Number(fd.get('shortBreak')) || 5),
          longBreak: Math.max(1, Number(fd.get('longBreak')) || 15),
          longBreakInterval: 4,
        };
        update((d) => { d.settings.pomodoro = newSettings; });
        durations.work = newSettings.work * 60;
        durations.shortBreak = newSettings.shortBreak * 60;
        durations.longBreak = newSettings.longBreak * 60;
        if (!running) {
          totalDuration = durations[mode];
          remaining = durations[mode];
          updateDisplay();
        }
      });

      updateDisplay();
      updateModeButtons();

      return () => {
        if (timerId) clearInterval(timerId);
        document.title = 'Learnio - Your Learning Ecosystem';
      };
    },
  };
}
