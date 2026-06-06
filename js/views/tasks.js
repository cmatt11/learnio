// Tasks view

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { getMatch } from '../router.js';
import { escapeHtml, uid, toast, confirmDialog, today, daysBetween, relativeDate } from '../utils.js';

const PRIORITY_META = {
  high: { label: 'High', color: '#dc2626', bg: '#fee2e2', dark: '#7f1d1d' },
  med: { label: 'Medium', color: '#d97706', bg: '#fef3c7', dark: '#78350f' },
  low: { label: 'Low', color: '#059669', bg: '#d1fae5', dark: '#064e3b' },
};

export function renderTasks() {
  const state = getState();
  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const sorted = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const headerActions = `<button id="new-task" class="btn btn-primary">${icon('plus', { size: 16 })} New task</button>`;

  // Group: Overdue, Today, This week, Later, Completed
  const t = today();
  const groups = { overdue: [], today: [], week: [], later: [], noDate: [], done: [] };
  for (const task of sorted) {
    if (task.completed) { groups.done.push(task); continue; }
    if (!task.dueDate) { groups.noDate.push(task); continue; }
    const diff = daysBetween(t, task.dueDate);
    if (diff < 0) groups.overdue.push(task);
    else if (diff === 0) groups.today.push(task);
    else if (diff <= 7) groups.week.push(task);
    else groups.later.push(task);
  }

  const renderGroup = (label, list, color = '') => list.length === 0 ? '' : `
    <section class="space-y-2">
      <h3 class="text-xs uppercase tracking-wider font-semibold ${color || 'text-slate-500 dark:text-slate-400'} px-1">${escapeHtml(label)} <span class="opacity-60">(${list.length})</span></h3>
      <ul class="space-y-2">${list.map((t) => taskRow(t, subjectById)).join('')}</ul>
    </section>
  `;

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-4xl mx-auto space-y-6">
      ${state.tasks.length === 0 ? `
        <div class="empty">
          ${icon('tasks', { size: 48, class: 'mx-auto mb-3 opacity-40' })}
          <p class="font-medium mb-1">No tasks yet</p>
          <p class="text-sm mb-4">Add assignments and to-dos to keep track of what's due.</p>
          <button id="new-task-empty" class="btn btn-primary">${icon('plus', { size: 16 })} Add your first task</button>
        </div>
      ` : `
        ${renderGroup('Overdue', groups.overdue, 'text-rose-600 dark:text-rose-400')}
        ${renderGroup('Today', groups.today, 'text-brand-600 dark:text-brand-400')}
        ${renderGroup('This week', groups.week)}
        ${renderGroup('Later', groups.later)}
        ${renderGroup('No due date', groups.noDate)}
        ${groups.done.length ? `
          <details class="space-y-2">
            <summary class="cursor-pointer text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">Completed (${groups.done.length})</summary>
            <ul class="space-y-2 mt-2">${groups.done.map((t) => taskRow(t, subjectById)).join('')}</ul>
          </details>
        ` : ''}
      `}
    </div>
  `;

  return {
    title: 'Tasks',
    subtitle: state.tasks.length ? `${state.tasks.filter((t) => !t.completed).length} open` : '',
    content,
    headerActions,
    onMount: (root) => {
      const open = (existing) => openTaskEditor(existing);
      root.querySelector('#new-task')?.addEventListener('click', () => open());
      root.querySelector('#new-task-empty')?.addEventListener('click', () => open());

      // Auto-open via ?new=1 query param
      const match = getMatch();
      if (match?.query?.new === '1') {
        setTimeout(() => open(), 50);
        // Strip the query
        history.replaceState(null, '', '#/tasks');
      }

      root.querySelectorAll('.task-toggle').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.id;
        update((d) => {
          const i = d.tasks.findIndex((t) => t.id === id);
          if (i >= 0) {
            d.tasks[i] = {
              ...d.tasks[i],
              completed: !d.tasks[i].completed,
              completedAt: !d.tasks[i].completed ? new Date().toISOString() : null,
            };
          }
        });
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }));
      root.querySelectorAll('.task-edit').forEach((b) => b.addEventListener('click', () => {
        const t = getState().tasks.find((t) => t.id === b.dataset.id);
        if (t) open(t);
      }));
      root.querySelectorAll('.task-delete').forEach((b) => b.addEventListener('click', async () => {
        const ok = await confirmDialog('Delete this task?', { danger: true, okText: 'Delete' });
        if (!ok) return;
        update((d) => { d.tasks = d.tasks.filter((t) => t.id !== b.dataset.id); });
        toast('Task deleted');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }));
    },
  };
}

function taskRow(task, subjectById) {
  const subj = task.subjectId ? subjectById[task.subjectId] : null;
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.med;
  const overdue = !task.completed && task.dueDate && daysBetween(today(), task.dueDate) < 0;
  return `
    <li class="card p-3 flex items-center gap-3 group ${task.completed ? 'opacity-60' : ''}">
      <button class="task-toggle w-5 h-5 rounded-md border-2 ${task.completed ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'} flex items-center justify-center transition flex-shrink-0" data-id="${escapeHtml(task.id)}" aria-label="Toggle">
        ${task.completed ? icon('check', { size: 14 }) : ''}
      </button>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium ${task.completed ? 'line-through' : ''}">${escapeHtml(task.title)}</span>
          ${subj ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background: ${escapeHtml(subj.color)}22; color: ${escapeHtml(subj.color)}">${escapeHtml(subj.name)}</span>` : ''}
          ${task.priority && task.priority !== 'med' ? `<span class="text-[10px] uppercase font-semibold" style="color: ${pm.color}">${pm.label}</span>` : ''}
        </div>
        ${task.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">${escapeHtml(task.notes)}</p>` : ''}
      </div>
      ${task.dueDate ? `<span class="text-xs ${overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500 dark:text-slate-400'} whitespace-nowrap">${escapeHtml(relativeDate(task.dueDate))}</span>` : ''}
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="task-edit btn btn-ghost btn-icon" data-id="${escapeHtml(task.id)}" aria-label="Edit">${icon('edit', { size: 14 })}</button>
        <button class="task-delete btn btn-ghost btn-icon text-rose-600" data-id="${escapeHtml(task.id)}" aria-label="Delete">${icon('trash', { size: 14 })}</button>
      </div>
    </li>
  `;
}

function openTaskEditor(existing = null) {
  const isEdit = !!existing;
  const state = getState();
  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}" ${existing?.subjectId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');

  openModal({
    title: isEdit ? 'Edit task' : 'New task',
    content: `
      <form id="task-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Title</label>
          <input name="title" class="input" placeholder="What needs to be done?" value="${escapeHtml(existing?.title || '')}" required autofocus />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1.5">Due date</label>
            <input type="date" name="dueDate" class="input" value="${escapeHtml(existing?.dueDate || '')}" />
          </div>
          <div>
            <label class="text-sm font-medium block mb-1.5">Priority</label>
            <select name="priority" class="select">
              <option value="low" ${existing?.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="med" ${(!existing || existing?.priority === 'med') ? 'selected' : ''}>Medium</option>
              <option value="high" ${existing?.priority === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Subject</label>
          <select name="subjectId" class="select">${subjectOptions}</select>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Notes (optional)</label>
          <textarea name="notes" class="textarea" rows="3" placeholder="Additional details">${escapeHtml(existing?.notes || '')}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="save">${isEdit ? 'Save' : 'Create'}</button>
    `,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#task-form');
      const submit = (e) => {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title') || '').trim();
        if (!title) { toast('Title is required', { type: 'error' }); return; }
        const dueDate = String(fd.get('dueDate') || '') || null;
        const priority = String(fd.get('priority') || 'med');
        const subjectId = String(fd.get('subjectId') || '') || null;
        const notes = String(fd.get('notes') || '').trim();
        update((d) => {
          if (isEdit) {
            const i = d.tasks.findIndex((t) => t.id === existing.id);
            if (i >= 0) d.tasks[i] = { ...d.tasks[i], title, dueDate, priority, subjectId, notes };
          } else {
            d.tasks.push({
              id: uid('task'), title, dueDate, priority, subjectId, notes,
              completed: false, completedAt: null, createdAt: new Date().toISOString(),
            });
          }
        });
        toast(isEdit ? 'Task updated' : 'Task created', { type: 'success' });
        close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      form.addEventListener('submit', submit);
      wrap.querySelector('#save').addEventListener('click', submit);
    },
  });
}
