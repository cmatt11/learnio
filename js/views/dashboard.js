// Dashboard view

import { getState } from '../state.js';
import { icon } from '../components/icons.js';
import { escapeHtml, formatDuration, relativeDate, daysBetween, today, ymd, formatDateShort, DAY_NAMES } from '../utils.js';
import { computeStreak, totalStudyMinutesInRange, sessionsByDay } from './_helpers.js';

export function renderDashboard() {
  const state = getState();
  const t = today();

  // Today's tasks (due today or overdue + not completed)
  const todayTasks = state.tasks
    .filter((task) => !task.completed && task.dueDate && daysBetween(t, task.dueDate) <= 0)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const upcomingTasks = state.tasks
    .filter((task) => !task.completed && task.dueDate && daysBetween(t, task.dueDate) > 0)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 5);

  // Today's classes
  const dow = new Date().getDay();
  const todayClasses = state.scheduleEvents
    .filter((e) => e.day === dow)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Cards due today
  const dueCards = state.cards.filter((c) => c.dueDate && c.dueDate.slice(0, 10) <= t);

  // Stats
  const streak = computeStreak(state.studySessions);
  const minutesToday = totalStudyMinutesInRange(state.studySessions, t, t);
  const minutesWeek = (() => {
    const start = new Date(); start.setDate(start.getDate() - 6);
    return totalStudyMinutesInRange(state.studySessions, ymd(start), t);
  })();

  // Last 7 days bar chart data
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = ymd(d);
    const mins = totalStudyMinutesInRange(state.studySessions, dateStr, dateStr);
    days.push({ date: dateStr, label: DAY_NAMES[d.getDay()].slice(0, 1), mins });
  }
  const maxMins = Math.max(...days.map((d) => d.mins), 60);

  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = (state.settings.userName || '').trim().split(/\s+/)[0];
  const who = firstName ? escapeHtml(firstName) : 'there';

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-6">
      <section>
        <h2 class="text-2xl md:text-3xl font-bold mb-1">${greeting}, ${who}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Here's your study overview for today.</p>
      </section>

      <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${statCard('flame', 'Day streak', `${streak}`, streak > 0 ? '#f97316' : '#94a3b8')}
        ${statCard('clock', 'Today', formatDuration(minutesToday), '#6366f1')}
        ${statCard('chart', 'This week', formatDuration(minutesWeek), '#10b981')}
        ${statCard('cards', 'Cards due', `${dueCards.length}`, '#f43f5e')}
      </section>

      <section class="grid md:grid-cols-3 gap-6">
        <div class="card p-5 md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">${icon('tasks', { size: 18 })} Today's tasks</h3>
            <a href="#/tasks" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">View all</a>
          </div>
          ${todayTasks.length === 0 ? `
            <div class="empty">
              ${icon('check', { size: 36, class: 'mx-auto mb-2 opacity-40' })}
              <div>Nothing due today. Great job staying on top!</div>
            </div>
          ` : `
            <ul class="space-y-2">
              ${todayTasks.slice(0, 6).map((task) => taskRow(task, subjectById)).join('')}
            </ul>
          `}
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">${icon('schedule', { size: 18 })} Today's classes</h3>
            <a href="#/schedule" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">Schedule</a>
          </div>
          ${todayClasses.length === 0 ? `
            <div class="empty text-sm">
              ${icon('schedule', { size: 32, class: 'mx-auto mb-2 opacity-40' })}
              <div>No classes today.</div>
            </div>
          ` : `
            <ul class="space-y-3">
              ${todayClasses.map((e) => `
                <li class="flex items-start gap-3">
                  <div class="w-1 self-stretch rounded-full" style="background: ${escapeHtml((subjectById[e.subjectId]?.color) || '#64748b')}"></div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">${escapeHtml(e.title)}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(e.startTime)} – ${escapeHtml(e.endTime)}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
                  </div>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </section>

      <section class="grid md:grid-cols-3 gap-6">
        <div class="card p-5 md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">${icon('chart', { size: 18 })} Last 7 days</h3>
            <a href="#/stats" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">Details</a>
          </div>
          <div class="flex items-end gap-2 h-32">
            ${days.map((d) => {
              const h = Math.max(2, (d.mins / maxMins) * 100);
              const isToday = d.date === t;
              return `
                <div class="flex-1 flex flex-col items-center gap-1.5">
                  <div class="text-[10px] text-slate-400 font-medium">${d.mins ? d.mins + 'm' : ''}</div>
                  <div class="w-full rounded-t-md transition-all" style="height: ${h}%; min-height: 4px; background: ${isToday ? '#6366f1' : '#a5b4fc'}; opacity: ${d.mins ? 1 : 0.35};" title="${d.date}: ${d.mins} min"></div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">${d.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-4">${icon('arrow_right', { size: 18 })} Coming up</h3>
          ${upcomingTasks.length === 0 ? `
            <div class="empty text-sm">
              <div>No upcoming tasks.</div>
            </div>
          ` : `
            <ul class="space-y-2">
              ${upcomingTasks.map((task) => taskRow(task, subjectById, { compact: true })).join('')}
            </ul>
          `}
        </div>
      </section>

      <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${quickAction('plus', 'New note', '#/notes/new')}
        ${quickAction('cards', 'Study cards', '#/flashcards')}
        ${quickAction('timer', 'Start pomodoro', '#/pomodoro')}
        ${quickAction('tasks', 'Add task', '#/tasks?new=1')}
      </section>
    </div>
  `;

  return { title: 'Dashboard', content };
}

function statCard(iconName, label, value, color) {
  return `
    <div class="card p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: ${color}1a; color: ${color}">
        ${icon(iconName, { size: 20, stroke: color })}
      </div>
      <div class="min-w-0">
        <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(label)}</div>
        <div class="text-lg font-bold truncate">${escapeHtml(value)}</div>
      </div>
    </div>
  `;
}

function taskRow(task, subjectById, { compact = false } = {}) {
  const subj = task.subjectId ? subjectById[task.subjectId] : null;
  const color = subj?.color || '#94a3b8';
  const overdue = task.dueDate && daysBetween(today(), task.dueDate) < 0;
  return `
    <li class="flex items-center gap-3 group">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${color}"></span>
      <a href="#/tasks" class="flex-1 min-w-0 text-sm hover:text-brand-600 dark:hover:text-brand-400 truncate">${escapeHtml(task.title)}</a>
      ${task.dueDate ? `<span class="text-xs ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}">${escapeHtml(relativeDate(task.dueDate))}</span>` : ''}
      ${!compact && task.priority === 'high' ? '<span class="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">High</span>' : ''}
    </li>
  `;
}

function quickAction(iconName, label, href) {
  return `
    <a href="${href}" class="card p-4 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
      <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center group-hover:scale-110 transition-transform">
        ${icon(iconName, { size: 18 })}
      </div>
      <span class="text-sm font-medium">${escapeHtml(label)}</span>
    </a>
  `;
}
