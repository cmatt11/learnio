// Stats view

import { getState } from '../state.js';
import { icon } from '../components/icons.js';
import { escapeHtml, formatDuration, today, ymd, addDays, DAY_SHORT } from '../utils.js';
import { computeStreak, totalStudyMinutesInRange, sessionsByDay } from './_helpers.js';

export function renderStats() {
  const state = getState();
  const t = today();

  const totalSessions = state.studySessions.length;
  const totalMinutes = state.studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const streak = computeStreak(state.studySessions);

  // Last 30 days heatmap
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const dateStr = ymd(d);
    const mins = totalStudyMinutesInRange(state.studySessions, dateStr, dateStr);
    days.push({ date: dateStr, mins, label: DAY_SHORT[d.getDay()] });
  }
  const max = Math.max(...days.map((d) => d.mins), 30);

  // Per subject minutes
  const bySubj = new Map();
  for (const s of state.studySessions) {
    const k = s.subjectId || '_none';
    bySubj.set(k, (bySubj.get(k) || 0) + (s.durationMinutes || 0));
  }
  const subjectStats = Array.from(bySubj.entries())
    .map(([id, mins]) => {
      const subj = state.subjects.find((x) => x.id === id);
      return { id, name: subj?.name || 'Unassigned', color: subj?.color || '#94a3b8', mins };
    })
    .sort((a, b) => b.mins - a.mins);
  const totalTracked = Math.max(1, subjectStats.reduce((acc, s) => acc + s.mins, 0));

  const tasksDone = state.tasks.filter((t) => t.completed).length;
  const tasksOpen = state.tasks.filter((t) => !t.completed).length;
  const cardsTotal = state.cards.length;
  const cardsDue = state.cards.filter((c) => (c.dueDate || '0') <= t).length;

  const heat = days.map((d) => {
    const intensity = d.mins === 0 ? 0 : Math.min(4, Math.ceil((d.mins / max) * 4));
    const colors = ['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.25)', 'rgba(99,102,241,0.5)', 'rgba(99,102,241,0.75)', '#6366f1'];
    return `<div class="aspect-square rounded-md" style="background: ${colors[intensity]}" title="${d.date}: ${d.mins} min"></div>`;
  }).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-6">
      <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${stat('flame', 'Streak', `${streak} days`, '#f97316')}
        ${stat('clock', 'Total time', formatDuration(totalMinutes), '#6366f1')}
        ${stat('chart', 'Sessions', `${totalSessions}`, '#10b981')}
        ${stat('cards', 'Cards', `${cardsTotal}`, '#f43f5e')}
      </section>

      <section class="card p-5">
        <h3 class="font-semibold flex items-center gap-2 mb-4">${icon('chart', { size: 18 })} Last 30 days</h3>
        <div class="grid grid-cols-15 md:grid-cols-30 gap-1" style="grid-template-columns: repeat(30, minmax(0, 1fr))">
          ${heat}
        </div>
        <div class="flex items-center gap-2 mt-4 text-xs text-slate-500">
          <span>Less</span>
          <div class="flex gap-1">
            <div class="w-3 h-3 rounded" style="background: rgba(99,102,241,0.08)"></div>
            <div class="w-3 h-3 rounded" style="background: rgba(99,102,241,0.25)"></div>
            <div class="w-3 h-3 rounded" style="background: rgba(99,102,241,0.5)"></div>
            <div class="w-3 h-3 rounded" style="background: rgba(99,102,241,0.75)"></div>
            <div class="w-3 h-3 rounded" style="background: #6366f1"></div>
          </div>
          <span>More</span>
        </div>
      </section>

      <section class="grid md:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-4">${icon('layers', { size: 18 })} Time by subject</h3>
          ${subjectStats.length === 0 ? '<div class="empty text-sm">No study sessions yet.</div>' : `
            <ul class="space-y-3">
              ${subjectStats.map((s) => {
                const pct = Math.round((s.mins / totalTracked) * 100);
                return `
                  <li>
                    <div class="flex justify-between items-center mb-1.5">
                      <div class="flex items-center gap-2 text-sm">
                        <span class="w-2.5 h-2.5 rounded-full" style="background: ${escapeHtml(s.color)}"></span>
                        <span class="font-medium">${escapeHtml(s.name)}</span>
                      </div>
                      <span class="text-sm text-slate-500">${escapeHtml(formatDuration(s.mins))} <span class="text-xs opacity-60">(${pct}%)</span></span>
                    </div>
                    <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" style="width: ${pct}%; background: ${escapeHtml(s.color)}"></div>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          `}
        </div>

        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-4">${icon('check', { size: 18 })} Activity</h3>
          <ul class="space-y-3 text-sm">
            <li class="flex justify-between"><span class="text-slate-500">Tasks completed</span><span class="font-semibold">${tasksDone}</span></li>
            <li class="flex justify-between"><span class="text-slate-500">Tasks open</span><span class="font-semibold">${tasksOpen}</span></li>
            <li class="flex justify-between"><span class="text-slate-500">Total flashcards</span><span class="font-semibold">${cardsTotal}</span></li>
            <li class="flex justify-between"><span class="text-slate-500">Cards due now</span><span class="font-semibold">${cardsDue}</span></li>
            <li class="flex justify-between"><span class="text-slate-500">Notes</span><span class="font-semibold">${state.notes.length}</span></li>
            <li class="flex justify-between"><span class="text-slate-500">Subjects</span><span class="font-semibold">${state.subjects.length}</span></li>
          </ul>
        </div>
      </section>
    </div>
  `;

  return { title: 'Stats', subtitle: 'Your learning progress', content };
}

function stat(iconName, label, value, color) {
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
