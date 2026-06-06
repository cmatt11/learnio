// Subjects view (list + detail)

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { navigate } from '../router.js';
import { escapeHtml, uid, SUBJECT_COLORS, toast, confirmDialog } from '../utils.js';

export function renderSubjects() {
  const state = getState();
  const subjects = state.subjects;

  const headerActions = `<button id="new-subject" class="btn btn-primary">${icon('plus', { size: 16 })} New subject</button>`;

  const cards = subjects.map((s) => {
    const noteCount = state.notes.filter((n) => n.subjectId === s.id).length;
    const taskCount = state.tasks.filter((t) => t.subjectId === s.id && !t.completed).length;
    const deckCount = state.decks.filter((d) => d.subjectId === s.id).length;
    return `
      <a href="#/subjects/${encodeURIComponent(s.id)}" class="card p-5 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0" style="background: ${escapeHtml(s.color)}">
            ${escapeHtml(s.name.charAt(0).toUpperCase())}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate">${escapeHtml(s.name)}</h3>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>${noteCount} ${noteCount === 1 ? 'note' : 'notes'}</span>
              <span>${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}</span>
              <span>${deckCount} ${deckCount === 1 ? 'deck' : 'decks'}</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      ${subjects.length === 0 ? `
        <div class="empty">
          ${icon('layers', { size: 48, class: 'mx-auto mb-3 opacity-40' })}
          <p class="mb-1 font-medium">No subjects yet</p>
          <p class="text-sm mb-4">Create a subject to start organizing your studies.</p>
          <button id="new-subject-empty" class="btn btn-primary">${icon('plus', { size: 16 })} Create your first subject</button>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
      `}
    </div>
  `;

  return {
    title: 'Subjects',
    subtitle: subjects.length ? `${subjects.length} ${subjects.length === 1 ? 'subject' : 'subjects'}` : '',
    content,
    headerActions,
    onMount: (root) => {
      const open = () => openSubjectEditor();
      root.querySelector('#new-subject')?.addEventListener('click', open);
      root.querySelector('#new-subject-empty')?.addEventListener('click', open);
    },
  };
}

export function renderSubjectDetail(id) {
  const state = getState();
  const s = state.subjects.find((x) => x.id === id);

  if (!s) {
    return {
      title: 'Subject not found',
      content: `
        <div class="px-4 md:px-8 py-12 max-w-3xl mx-auto text-center">
          <p class="text-slate-500 mb-4">That subject doesn't exist.</p>
          <a href="#/subjects" class="btn btn-primary">Back to subjects</a>
        </div>
      `,
    };
  }

  const notes = state.notes.filter((n) => n.subjectId === id).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const tasks = state.tasks.filter((t) => t.subjectId === id);
  const openTasks = tasks.filter((t) => !t.completed);
  const decks = state.decks.filter((d) => d.subjectId === id);
  const events = state.scheduleEvents.filter((e) => e.subjectId === id);

  const headerActions = `
    <button id="edit-subject" class="btn btn-secondary">${icon('edit', { size: 16 })} Edit</button>
    <button id="delete-subject" class="btn btn-ghost text-rose-600 dark:text-rose-400">${icon('trash', { size: 16 })}</button>
  `;

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-6">
      <a href="#/subjects" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">${icon('arrow_left', { size: 14 })} All subjects</a>

      <div class="card p-6 flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-2xl" style="background: ${escapeHtml(s.color)}">
          ${escapeHtml(s.name.charAt(0).toUpperCase())}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold truncate">${escapeHtml(s.name)}</h2>
          <div class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4">
            <span>${notes.length} notes</span>
            <span>${openTasks.length} open tasks</span>
            <span>${decks.length} decks</span>
            <span>${events.length} schedule entries</span>
          </div>
        </div>
      </div>

      <section class="grid md:grid-cols-2 gap-6">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold flex items-center gap-2">${icon('notes', { size: 18 })} Notes</h3>
            <a href="#/notes/new?subject=${encodeURIComponent(id)}" class="btn btn-ghost btn-icon">${icon('plus', { size: 16 })}</a>
          </div>
          ${notes.length === 0 ? '<div class="empty text-sm">No notes yet.</div>' : `
            <ul class="space-y-2">
              ${notes.slice(0, 8).map((n) => `
                <li><a href="#/notes/${encodeURIComponent(n.id)}" class="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div class="text-sm font-medium truncate">${escapeHtml(n.title || 'Untitled')}</div>
                </a></li>
              `).join('')}
            </ul>
          `}
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold flex items-center gap-2">${icon('tasks', { size: 18 })} Open tasks</h3>
            <a href="#/tasks" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">View all</a>
          </div>
          ${openTasks.length === 0 ? '<div class="empty text-sm">No open tasks.</div>' : `
            <ul class="space-y-2">
              ${openTasks.slice(0, 8).map((t) => `
                <li class="flex items-center gap-2 text-sm">
                  <span class="w-2 h-2 rounded-full" style="background: ${escapeHtml(s.color)}"></span>
                  <span class="flex-1 truncate">${escapeHtml(t.title)}</span>
                  ${t.dueDate ? `<span class="text-xs text-slate-500">${escapeHtml(t.dueDate)}</span>` : ''}
                </li>
              `).join('')}
            </ul>
          `}
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold flex items-center gap-2">${icon('cards', { size: 18 })} Flashcard decks</h3>
            <a href="#/flashcards" class="text-xs text-brand-600 dark:text-brand-400 hover:underline">All decks</a>
          </div>
          ${decks.length === 0 ? '<div class="empty text-sm">No decks yet.</div>' : `
            <ul class="space-y-2">
              ${decks.map((d) => {
                const cardCount = state.cards.filter((c) => c.deckId === d.id).length;
                return `
                  <li><a href="#/flashcards/${encodeURIComponent(d.id)}" class="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div class="text-sm font-medium truncate">${escapeHtml(d.name)}</div>
                    <div class="text-xs text-slate-500">${cardCount} cards</div>
                  </a></li>
                `;
              }).join('')}
            </ul>
          `}
        </div>

        <div class="card p-5">
          <h3 class="font-semibold flex items-center gap-2 mb-3">${icon('schedule', { size: 18 })} Schedule</h3>
          ${events.length === 0 ? '<div class="empty text-sm">No scheduled classes.</div>' : `
            <ul class="space-y-2">
              ${events.map((e) => {
                const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][e.day];
                return `<li class="text-sm flex justify-between gap-3">
                  <span class="font-medium">${escapeHtml(day)} · ${escapeHtml(e.startTime)}–${escapeHtml(e.endTime)}</span>
                  <span class="text-slate-500 truncate">${escapeHtml(e.location || '')}</span>
                </li>`;
              }).join('')}
            </ul>
          `}
        </div>
      </section>
    </div>
  `;

  return {
    title: s.name,
    subtitle: 'Subject overview',
    content,
    headerActions,
    onMount: (root) => {
      root.querySelector('#edit-subject')?.addEventListener('click', () => openSubjectEditor(s));
      root.querySelector('#delete-subject')?.addEventListener('click', async () => {
        const ok = await confirmDialog(`Delete "${s.name}"? Notes, tasks, decks and schedule items linked to it will lose their subject (not deleted).`, { danger: true, okText: 'Delete' });
        if (!ok) return;
        update((d) => {
          d.subjects = d.subjects.filter((x) => x.id !== id);
          // Detach references
          d.notes = d.notes.map((n) => n.subjectId === id ? { ...n, subjectId: null } : n);
          d.tasks = d.tasks.map((t) => t.subjectId === id ? { ...t, subjectId: null } : t);
          d.decks = d.decks.map((dk) => dk.subjectId === id ? { ...dk, subjectId: null } : dk);
          d.scheduleEvents = d.scheduleEvents.map((e) => e.subjectId === id ? { ...e, subjectId: null } : e);
        });
        toast('Subject deleted');
        navigate('/subjects');
      });
    },
  };
}

function openSubjectEditor(existing = null) {
  const isEdit = !!existing;
  const colorOptions = SUBJECT_COLORS.map((c) => `
    <button type="button" data-color="${c.value}" class="color-swatch w-8 h-8 rounded-full ring-2 ring-transparent transition" style="background: ${c.value}" aria-label="${c.name}"></button>
  `).join('');

  openModal({
    title: isEdit ? 'Edit subject' : 'New subject',
    content: `
      <form id="subject-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Name</label>
          <input name="name" class="input" placeholder="e.g. Calculus II" value="${escapeHtml(existing?.name || '')}" required autofocus />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Color</label>
          <div class="flex flex-wrap gap-2" id="color-picker">${colorOptions}</div>
          <input type="hidden" name="color" value="${escapeHtml(existing?.color || SUBJECT_COLORS[0].value)}" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="save-subject">${isEdit ? 'Save' : 'Create'}</button>
    `,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#subject-form');
      const colorInput = form.querySelector('input[name="color"]');
      const updateSwatches = () => {
        wrap.querySelectorAll('.color-swatch').forEach((b) => {
          b.classList.toggle('ring-slate-900', b.dataset.color === colorInput.value);
          b.classList.toggle('dark:ring-white', b.dataset.color === colorInput.value);
          b.classList.toggle('scale-110', b.dataset.color === colorInput.value);
        });
      };
      updateSwatches();
      wrap.querySelectorAll('.color-swatch').forEach((b) => {
        b.addEventListener('click', () => { colorInput.value = b.dataset.color; updateSwatches(); });
      });
      const submit = (e) => {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        const color = String(fd.get('color') || SUBJECT_COLORS[0].value);
        if (!name) { toast('Name is required', { type: 'error' }); return; }
        update((d) => {
          if (isEdit) {
            const idx = d.subjects.findIndex((x) => x.id === existing.id);
            if (idx >= 0) d.subjects[idx] = { ...d.subjects[idx], name, color };
          } else {
            d.subjects.push({ id: uid('sub'), name, color, icon: 'book', createdAt: new Date().toISOString() });
          }
        });
        toast(isEdit ? 'Subject updated' : 'Subject created', { type: 'success' });
        close();
        // Refresh current view
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      form.addEventListener('submit', submit);
      wrap.querySelector('#save-subject').addEventListener('click', submit);
    },
  });
}
