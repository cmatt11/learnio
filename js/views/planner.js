// Smart Planner - generates an optimized study schedule from tasks.
// Scope: Today (single-day timeline) or This Week (multi-day distribution).

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { escapeHtml, uid, toast, today, ymd, addDays, daysBetween, hhmmToMinutes, minutesToHHMM, DAY_NAMES, DAY_SHORT, formatDuration } from '../utils.js';

const PRIO_WEIGHT = { high: 3, med: 2, low: 1 };
const PRIO_LABEL = { high: 'High', med: 'Medium', low: 'Low' };
const PRIO_COLOR = { high: '#dc2626', med: '#d97706', low: '#059669' };

// 12-hour time formatting from minutes-since-midnight
function fmt12(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`;
}

// ---- Scheduling engine -----------------------------------------------------

// Plan a single day's worth of tasks into time slots, inserting breaks.
// tasks: [{ ...task, dur, deadlineMin? }] already ordered.
// Returns { slots, skipped, breakCount }.
function planDay(orderedTasks, { start, end, breakEvery, breakLen }) {
  let cur = start;
  let sinceBreak = 0;
  let breakCount = 0;
  const slots = [];
  const skipped = [];

  for (const t of orderedTasks) {
    // Insert a break if we've been going long enough and the next task would push past the cadence
    if (sinceBreak > 0 && sinceBreak + t.dur > breakEvery) {
      if (cur + breakLen + t.dur <= end) {
        slots.push({ type: 'break', start: cur, end: cur + breakLen });
        cur += breakLen;
        sinceBreak = 0;
        breakCount++;
      }
    }
    if (cur + t.dur > end) {
      skipped.push(t);
      continue;
    }
    slots.push({ type: 'task', task: t, start: cur, end: cur + t.dur });
    sinceBreak += t.dur;
    cur += t.dur;
  }
  return { slots, skipped, breakCount };
}

// Order tasks within a day: deadline time first, then priority, then longer first.
function orderForDay(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.deadlineMin != null && b.deadlineMin != null) return a.deadlineMin - b.deadlineMin;
    if (a.deadlineMin != null) return -1;
    if (b.deadlineMin != null) return 1;
    if (PRIO_WEIGHT[b.prio] !== PRIO_WEIGHT[a.prio]) return PRIO_WEIGHT[b.prio] - PRIO_WEIGHT[a.prio];
    return b.dur - a.dur;
  });
}

// Distribute tasks across multiple days (week scope) respecting capacity + due dates.
// planTasks: [{ ...task, dur, prio, dueDate(date)|null }]
// days: array of dateStr (today .. +6)
function distributeWeek(planTasks, days, settings) {
  const windowMin = hhmmToMinutes(settings.dayEnd) - hhmmToMinutes(settings.dayStart);
  const estBreaks = Math.max(0, Math.floor(windowMin / settings.breakEvery)) * settings.breakLen;
  const capacity = Math.max(60, windowMin - estBreaks);

  const remaining = days.map(() => capacity);
  const buckets = days.map(() => []);
  const unscheduled = [];

  const dayIndexFor = (dateStr) => days.indexOf(dateStr);

  // Order: dated tasks by due date then priority; then undated by priority/length
  const dated = planTasks.filter((t) => t.dueDate).sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return PRIO_WEIGHT[b.prio] - PRIO_WEIGHT[a.prio];
  });
  const undated = planTasks.filter((t) => !t.dueDate).sort((a, b) => {
    if (PRIO_WEIGHT[b.prio] !== PRIO_WEIGHT[a.prio]) return PRIO_WEIGHT[b.prio] - PRIO_WEIGHT[a.prio];
    return b.dur - a.dur;
  });

  const place = (t, preferredIdx, mustBeOnOrBefore) => {
    // Try preferred day, then earlier days (for deadlines), then later days.
    const order = [];
    if (preferredIdx >= 0) order.push(preferredIdx);
    // earlier days (closer to preferred first)
    for (let i = (preferredIdx >= 0 ? preferredIdx - 1 : days.length - 1); i >= 0; i--) order.push(i);
    // later days
    if (mustBeOnOrBefore == null) {
      for (let i = (preferredIdx >= 0 ? preferredIdx + 1 : 0); i < days.length; i++) order.push(i);
    }
    for (const idx of order) {
      if (idx < 0 || idx >= days.length) continue;
      if (mustBeOnOrBefore != null && idx > mustBeOnOrBefore) continue;
      if (remaining[idx] >= t.dur) {
        buckets[idx].push(t);
        remaining[idx] -= t.dur;
        return true;
      }
    }
    // Fallback: cram into preferred (or today) even if over capacity, so nothing is lost silently
    const fallback = preferredIdx >= 0 ? preferredIdx : 0;
    buckets[fallback].push(t);
    remaining[fallback] -= t.dur;
    return false;
  };

  for (const t of dated) {
    let idx = dayIndexFor(t.dueDate);
    if (idx < 0) {
      // due before today (overdue) -> today; due after window -> last day
      idx = t.dueDate < days[0] ? 0 : days.length - 1;
    }
    place(t, idx, idx);
  }
  for (const t of undated) {
    place(t, -1, null);
  }

  // Build per-day plans
  return days.map((dateStr, i) => {
    const ordered = orderForDay(buckets[i]);
    const res = planDay(ordered, {
      start: hhmmToMinutes(settings.dayStart),
      end: hhmmToMinutes(settings.dayEnd),
      breakEvery: settings.breakEvery,
      breakLen: settings.breakLen,
    });
    return { dateStr, ...res };
  });
}

// ---- View ------------------------------------------------------------------

export function renderPlanner() {
  const state = getState();
  const settings = state.settings.planner;

  const headerActions = `<button id="reload-tasks" class="btn btn-secondary">${icon('reset', { size: 16 })} Reload from tasks</button>`;

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-4xl mx-auto space-y-5">
      <div class="card p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="font-semibold flex items-center gap-2">${icon('schedule', { size: 18 })} Plan for</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pulls in your open tasks automatically.</p>
          </div>
          <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 self-start">
            <button class="scope-btn btn btn-ghost btn-icon px-4 py-1.5" data-scope="today">Today</button>
            <button class="scope-btn btn btn-ghost btn-icon px-4 py-1.5" data-scope="week">This week</button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label class="block">
            <span class="text-xs text-slate-500 dark:text-slate-400">Day starts</span>
            <input type="time" id="day-start" class="input mt-1" value="${escapeHtml(settings.dayStart)}" />
          </label>
          <label class="block">
            <span class="text-xs text-slate-500 dark:text-slate-400">Day ends</span>
            <input type="time" id="day-end" class="input mt-1" value="${escapeHtml(settings.dayEnd)}" />
          </label>
          <label class="block">
            <span class="text-xs text-slate-500 dark:text-slate-400">Break every (min)</span>
            <input type="number" id="break-every" class="input mt-1" min="30" max="180" step="10" value="${settings.breakEvery}" />
          </label>
          <label class="block">
            <span class="text-xs text-slate-500 dark:text-slate-400">Break length (min)</span>
            <input type="number" id="break-len" class="input mt-1" min="5" max="30" step="5" value="${settings.breakLen}" />
          </label>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold flex items-center gap-2">${icon('tasks', { size: 18 })} Tasks to schedule <span id="plan-count" class="text-slate-400 font-normal"></span></h3>
          <button id="add-plan-task" class="btn btn-ghost btn-sm">${icon('plus', { size: 14 })} Add</button>
        </div>
        <div id="plan-task-list" class="space-y-2"></div>
      </div>

      <button id="generate" class="btn btn-primary w-full justify-center" style="height: 44px">
        ${icon('schedule', { size: 18 })} Generate my schedule
      </button>

      <div id="planner-output" class="space-y-5"></div>
    </div>
  `;

  return {
    title: 'Smart Planner',
    subtitle: 'Turn your tasks into an optimized study plan',
    content,
    headerActions,
    onMount: (root) => mountPlanner(root, settings),
  };
}

function mountPlanner(root, settings) {
  let scope = 'today';
  // Working set of tasks for the plan. Each: { id, title, dur, prio, subjectId, dueDate, deadlineMin }
  let planTasks = [];

  const listEl = root.querySelector('#plan-task-list');
  const countEl = root.querySelector('#plan-count');
  const outputEl = root.querySelector('#planner-output');
  const scopeBtns = root.querySelectorAll('.scope-btn');

  const subjectById = () => Object.fromEntries(getState().subjects.map((s) => [s.id, s]));

  const readSettings = () => ({
    dayStart: root.querySelector('#day-start').value || '08:00',
    dayEnd: root.querySelector('#day-end').value || '21:00',
    breakEvery: parseInt(root.querySelector('#break-every').value, 10) || 90,
    breakLen: parseInt(root.querySelector('#break-len').value, 10) || 15,
  });

  const persistSettings = () => {
    const s = readSettings();
    update((d) => { d.settings.planner = { ...d.settings.planner, ...s }; });
  };

  // Build plan tasks from Learnio's open tasks for the current scope
  const loadFromTasks = () => {
    const state = getState();
    const t = today();
    const open = state.tasks.filter((task) => !task.completed);
    let relevant;
    if (scope === 'today') {
      // due today or overdue or no date
      relevant = open.filter((task) => !task.dueDate || daysBetween(t, task.dueDate) <= 0);
    } else {
      // due within next 7 days, overdue, or no date
      relevant = open.filter((task) => !task.dueDate || daysBetween(t, task.dueDate) <= 6);
    }
    planTasks = relevant.map((task) => ({
      id: task.id,
      title: task.title,
      dur: task.estimatedMinutes || getState().settings.planner.defaultDuration || 45,
      prio: task.priority || 'med',
      subjectId: task.subjectId || null,
      dueDate: task.dueDate || null,
      deadlineMin: null,
    }));
    renderList();
  };

  const renderList = () => {
    countEl.textContent = planTasks.length ? `(${planTasks.length})` : '';
    const sm = subjectById();
    if (planTasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty text-sm py-6">
          <p class="mb-1">No open tasks for this ${scope === 'today' ? 'day' : 'week'}.</p>
          <p class="text-xs">Add one above, or create tasks in the Tasks section.</p>
        </div>`;
      return;
    }
    listEl.innerHTML = planTasks.map((t, i) => {
      const subj = t.subjectId ? sm[t.subjectId] : null;
      return `
        <div class="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0" data-i="${i}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background: ${escapeHtml(subj?.color || PRIO_COLOR[t.prio])}"></span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${escapeHtml(t.title)}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">
              ${escapeHtml(PRIO_LABEL[t.prio])}${subj ? ' · ' + escapeHtml(subj.name) : ''}${t.dueDate && scope === 'week' ? ' · due ' + escapeHtml(t.dueDate) : ''}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <input type="number" class="input dur-input" data-i="${i}" min="5" max="300" step="5" value="${t.dur}" style="width: 72px; height: 32px;" aria-label="Duration in minutes" />
            <span class="text-xs text-slate-400">min</span>
            <button class="btn btn-ghost btn-icon remove-plan-task" data-i="${i}" aria-label="Remove">${icon('x', { size: 14 })}</button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.dur-input').forEach((inp) => {
      inp.addEventListener('change', () => {
        const i = Number(inp.dataset.i);
        const val = Math.max(5, parseInt(inp.value, 10) || 45);
        planTasks[i].dur = val;
        // Persist back onto the real task if it has an id matching a stored task
        const tid = planTasks[i].id;
        if (tid) {
          update((d) => {
            const idx = d.tasks.findIndex((x) => x.id === tid);
            if (idx >= 0) d.tasks[idx] = { ...d.tasks[idx], estimatedMinutes: val };
          });
        }
      });
    });
    listEl.querySelectorAll('.remove-plan-task').forEach((b) => {
      b.addEventListener('click', () => {
        planTasks.splice(Number(b.dataset.i), 1);
        renderList();
      });
    });
  };

  // Quick add - creates a real Learnio task AND adds to the plan
  const openAddTask = () => {
    const state = getState();
    const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
      `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
    openModal({
      title: 'Add a task',
      content: `
        <form id="pt-form" class="space-y-4">
          <div>
            <label class="text-sm font-medium block mb-1.5">Task name</label>
            <input name="title" class="input" placeholder="e.g. Read Chapter 5" required autofocus />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium block mb-1.5">Duration (min)</label>
              <input type="number" name="dur" class="input" min="5" max="300" step="5" value="45" />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1.5">Priority</label>
              <select name="prio" class="select">
                <option value="high">High</option>
                <option value="med" selected>Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium block mb-1.5">Subject</label>
              <select name="subjectId" class="select">${subjectOptions}</select>
            </div>
            <div>
              <label class="text-sm font-medium block mb-1.5">${scope === 'week' ? 'Due date' : 'Deadline time'} (optional)</label>
              <input type="${scope === 'week' ? 'date' : 'time'}" name="when" class="input" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" name="save" checked /> Also save to my Tasks
          </label>
        </form>`,
      footer: `
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="pt-save">Add</button>`,
      onMount: (wrap, close) => {
        const form = wrap.querySelector('#pt-form');
        const submit = (e) => {
          if (e) e.preventDefault();
          const fd = new FormData(form);
          const title = String(fd.get('title') || '').trim();
          if (!title) { toast('Task name is required', { type: 'error' }); return; }
          const dur = Math.max(5, parseInt(fd.get('dur'), 10) || 45);
          const prio = String(fd.get('prio') || 'med');
          const subjectId = String(fd.get('subjectId') || '') || null;
          const when = String(fd.get('when') || '');
          const save = fd.get('save') === 'on';

          const dueDate = scope === 'week' && when ? when : null;
          const deadlineMin = scope === 'today' && when ? hhmmToMinutes(when) : null;

          let id = null;
          if (save) {
            id = uid('task');
            update((d) => {
              d.tasks.push({
                id, title, dueDate, priority: prio, subjectId,
                notes: '', estimatedMinutes: dur, completed: false,
                completedAt: null, createdAt: new Date().toISOString(),
              });
            });
          }
          planTasks.push({ id, title, dur, prio, subjectId, dueDate, deadlineMin });
          renderList();
          toast('Task added', { type: 'success' });
          close();
        };
        form.addEventListener('submit', submit);
        wrap.querySelector('#pt-save').addEventListener('click', submit);
      },
    });
  };

  const setScope = (s) => {
    scope = s;
    scopeBtns.forEach((b) => {
      const active = b.dataset.scope === s;
      b.classList.toggle('!bg-brand-600', active);
      b.classList.toggle('!text-white', active);
    });
    outputEl.innerHTML = '';
    loadFromTasks();
  };

  const generate = () => {
    persistSettings();
    if (planTasks.length === 0) { toast('Add at least one task first', { type: 'error' }); return; }
    const s = readSettings();
    const start = hhmmToMinutes(s.dayStart);
    const end = hhmmToMinutes(s.dayEnd);
    if (end <= start) { toast('Day end must be after day start', { type: 'error' }); return; }

    if (scope === 'today') {
      const ordered = orderForDay(planTasks);
      const { slots, skipped, breakCount } = planDay(ordered, { start, end, breakEvery: s.breakEvery, breakLen: s.breakLen });
      outputEl.innerHTML = renderStats(slots, breakCount) + `
        <div class="card p-5">
          ${renderTimelineHeader('Your optimized schedule')}
          <div class="space-y-1 mt-3">${renderSlots(slots, subjectById())}${renderEndMarker(slots, start)}</div>
          ${skipped.length ? overflowWarn(skipped.length) : ''}
          ${renderTips(planTasks, breakCount)}
        </div>`;
    } else {
      const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), i)));
      const dayPlans = distributeWeek(planTasks, days, s);
      const allSlots = dayPlans.flatMap((d) => d.slots);
      const totalBreaks = dayPlans.reduce((a, d) => a + d.breakCount, 0);
      const totalSkipped = dayPlans.reduce((a, d) => a + d.skipped.length, 0);
      const sm = subjectById();
      const dayCards = dayPlans.map((d) => {
        const taskSlots = d.slots.filter((x) => x.type === 'task');
        if (taskSlots.length === 0) return '';
        const date = new Date(d.dateStr + 'T00:00:00');
        const isToday = d.dateStr === today();
        const dayMins = taskSlots.reduce((a, x) => a + x.task.dur, 0);
        return `
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold flex items-center gap-2">
                ${escapeHtml(DAY_NAMES[date.getDay()])}
                <span class="text-xs font-normal text-slate-400">${escapeHtml(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}${isToday ? ' · Today' : ''}</span>
              </h4>
              <span class="text-xs text-slate-500">${escapeHtml(formatDuration(dayMins))} · ${taskSlots.length} task${taskSlots.length === 1 ? '' : 's'}</span>
            </div>
            <div class="space-y-1">${renderSlots(d.slots, sm)}${renderEndMarker(d.slots, start)}</div>
          </div>`;
      }).join('');

      outputEl.innerHTML = renderStats(allSlots, totalBreaks)
        + (dayCards || `<div class="card p-5"><div class="empty text-sm">Nothing to schedule this week.</div></div>`)
        + `<div class="card p-5">${totalSkipped ? overflowWarn(totalSkipped) : ''}${renderTips(planTasks, totalBreaks)}</div>`;
    }
    outputEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Wire events
  scopeBtns.forEach((b) => b.addEventListener('click', () => setScope(b.dataset.scope)));
  root.querySelector('#add-plan-task').addEventListener('click', openAddTask);
  root.querySelector('#reload-tasks').addEventListener('click', () => { loadFromTasks(); toast('Reloaded from your tasks'); });
  root.querySelector('#generate').addEventListener('click', generate);
  ['#day-start', '#day-end', '#break-every', '#break-len'].forEach((sel) => {
    root.querySelector(sel).addEventListener('change', persistSettings);
  });

  // Init
  setScope('today');
}

// ---- Render helpers --------------------------------------------------------

function renderStats(slots, breakCount) {
  const taskSlots = slots.filter((s) => s.type === 'task');
  const totalMins = taskSlots.reduce((a, s) => a + s.task.dur, 0);
  return `
    <div class="grid grid-cols-3 gap-3">
      ${statBox(taskSlots.length, 'tasks scheduled')}
      ${statBox(formatDuration(totalMins), 'total study time')}
      ${statBox(breakCount, 'breaks planned')}
    </div>`;
}

function statBox(value, label) {
  return `
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold tabular-nums">${escapeHtml(String(value))}</div>
      <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${escapeHtml(label)}</div>
    </div>`;
}

function renderTimelineHeader(title) {
  return `
    <div class="flex items-center justify-between">
      <h3 class="font-semibold flex items-center gap-2">${icon('schedule', { size: 18 })} ${escapeHtml(title)}</h3>
      <button class="btn btn-ghost btn-sm no-print" onclick="window.print()">${icon('download', { size: 14 })} Print</button>
    </div>`;
}

function renderSlots(slots, subjectById) {
  return slots.map((s, i) => {
    const delay = i * 50;
    if (s.type === 'break') {
      return `
        <div class="flex items-center gap-3 py-1 fade-in" style="animation-delay:${delay}ms">
          <div class="text-xs font-mono text-slate-400 w-16 text-right flex-shrink-0">${fmt12(s.start)}</div>
          <div class="flex-1 flex items-center gap-2 text-xs text-slate-400">
            <div class="flex-1 border-t border-dashed border-slate-300 dark:border-slate-700"></div>
            ${icon('timer', { size: 14 })} ${s.end - s.start} min break
            <div class="flex-1 border-t border-dashed border-slate-300 dark:border-slate-700"></div>
          </div>
        </div>`;
    }
    const t = s.task;
    const subj = t.subjectId ? subjectById[t.subjectId] : null;
    const accent = subj?.color || PRIO_COLOR[t.prio];
    const dlWarn = t.deadlineMin != null && s.end > t.deadlineMin;
    return `
      <div class="flex gap-3 fade-in" style="animation-delay:${delay}ms">
        <div class="text-xs font-mono text-slate-400 w-16 text-right flex-shrink-0 pt-3">${fmt12(s.start)}</div>
        <div class="flex-1 rounded-lg px-4 py-2.5" style="background: ${accent}14; border-left: 3px solid ${accent}">
          <div class="font-semibold text-sm">${escapeHtml(t.title)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ${t.dur} min
            ${subj ? ' · ' + escapeHtml(subj.name) : ''}
            · <span style="color:${PRIO_COLOR[t.prio]}">${escapeHtml(PRIO_LABEL[t.prio])}</span>
            ${dlWarn ? ' · <span class="text-rose-600 dark:text-rose-400">⚠ may miss deadline</span>' : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderEndMarker(slots, fallbackStart) {
  const lastEnd = slots.length ? slots[slots.length - 1].end : fallbackStart;
  return `
    <div class="flex items-center gap-3 pt-1">
      <div class="text-xs font-mono text-slate-400 w-16 text-right flex-shrink-0">${fmt12(lastEnd)}</div>
      <div class="flex-1 flex items-center gap-2">
        <div class="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
        <span class="text-xs text-slate-400 whitespace-nowrap">Done</span>
      </div>
    </div>`;
}

function overflowWarn(count) {
  return `
    <div class="mt-4 rounded-lg px-4 py-3 text-sm" style="background: #fef3c7; color: #78350f; border: 1px solid #f5d78a">
      ${icon('flag', { size: 14, class: 'inline -mt-0.5' })} ${count} task${count === 1 ? '' : 's'} couldn't fit in the available time. Try extending your day, shortening durations, or moving some to another day.
    </div>`;
}

function renderTips(planTasks, breakCount) {
  const highCnt = planTasks.filter((t) => t.prio === 'high').length;
  const hasDl = planTasks.some((t) => t.deadlineMin != null || t.dueDate);
  const tips = [];
  if (highCnt > 0) tips.push(`${highCnt} high-priority task${highCnt > 1 ? 's are' : ' is'} placed first, while your focus is sharpest.`);
  if (hasDl) tips.push('Deadline tasks are anchored ahead of their due time.');
  tips.push(`Breaks follow the ~90-minute focus rhythm — ${breakCount} break${breakCount === 1 ? '' : 's'} to keep you fresh.`);
  return `
    <div class="mt-4 rounded-lg px-4 py-3 text-sm bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 leading-relaxed">
      ${icon('star', { size: 14, class: 'inline -mt-0.5' })} ${escapeHtml(tips.join(' '))}
    </div>`;
}
