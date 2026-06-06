// Notes view (list + markdown editor)

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { navigate } from '../router.js';
import { escapeHtml, uid, formatDate, debounce, toast, confirmDialog, formatDateTime } from '../utils.js';
import { renderMarkdown } from '../markdown.js';

export function renderNotes() {
  const state = getState();
  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));
  const notes = [...state.notes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const headerActions = `
    <input id="notes-search" placeholder="Search notes…" class="input max-w-xs hidden md:block" />
    <a href="#/notes/new" class="btn btn-primary">${icon('plus', { size: 16 })} New note</a>
  `;

  const renderList = (filter = '') => {
    const filtered = filter
      ? notes.filter((n) => (n.title + ' ' + n.content).toLowerCase().includes(filter.toLowerCase()))
      : notes;
    if (filtered.length === 0) {
      return `
        <div class="empty">
          ${icon('notes', { size: 48, class: 'mx-auto mb-3 opacity-40' })}
          <p class="font-medium mb-1">${filter ? 'No matching notes' : 'No notes yet'}</p>
          <p class="text-sm mb-4">${filter ? 'Try a different search.' : 'Capture lecture notes, summaries, and ideas in markdown.'}</p>
          ${!filter ? '<a href="#/notes/new" class="btn btn-primary">' + icon('plus', { size: 16 }) + ' Create your first note</a>' : ''}
        </div>
      `;
    }
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filtered.map((n) => {
          const s = n.subjectId ? subjectById[n.subjectId] : null;
          const preview = (n.content || '').replace(/[#*_`>\[\]\(\)]/g, '').replace(/\s+/g, ' ').slice(0, 140);
          return `
            <a href="#/notes/${encodeURIComponent(n.id)}" class="card p-4 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all flex flex-col">
              <div class="flex items-start gap-2 mb-2">
                ${s ? `<span class="w-2 h-2 rounded-full mt-2" style="background: ${escapeHtml(s.color)}"></span>` : ''}
                <h3 class="font-semibold flex-1 truncate">${escapeHtml(n.title || 'Untitled')}</h3>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-3 flex-1">${escapeHtml(preview || 'Empty note')}</p>
              <div class="text-xs text-slate-400 flex items-center justify-between">
                <span>${escapeHtml(s?.name || 'No subject')}</span>
                <span>${escapeHtml(formatDate(n.updatedAt))}</span>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  };

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div id="notes-list">${renderList('')}</div>
    </div>
  `;

  return {
    title: 'Notes',
    subtitle: notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : '',
    content,
    headerActions,
    onMount: (root) => {
      const search = root.querySelector('#notes-search');
      const list = root.querySelector('#notes-list');
      if (search) {
        search.addEventListener('input', debounce(() => {
          list.innerHTML = renderList(search.value);
        }, 150));
      }
    },
  };
}

export function renderNoteEditor(id, defaultSubjectId) {
  const state = getState();
  const note = id ? state.notes.find((n) => n.id === id) : null;
  if (id && !note) {
    return {
      title: 'Note not found',
      content: `
        <div class="px-4 md:px-8 py-12 max-w-3xl mx-auto text-center">
          <p class="text-slate-500 mb-4">That note doesn't exist.</p>
          <a href="#/notes" class="btn btn-primary">Back to notes</a>
        </div>
      `,
    };
  }

  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}" ${(note?.subjectId || defaultSubjectId) === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');

  const initialTitle = note?.title || '';
  const initialContent = note?.content || '';

  const headerActions = `
    <button id="toggle-preview" class="btn btn-secondary">${icon('search', { size: 16 })} Preview</button>
    ${note ? `<button id="delete-note" class="btn btn-ghost text-rose-600 dark:text-rose-400">${icon('trash', { size: 16 })}</button>` : ''}
    <a href="#/notes" class="btn btn-ghost">Done</a>
  `;

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <a href="#/notes" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4">${icon('arrow_left', { size: 14 })} All notes</a>

      <div class="card p-4 md:p-6 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <input id="note-title" class="input text-lg font-semibold flex-1" placeholder="Untitled note" value="${escapeHtml(initialTitle)}" />
          <select id="note-subject" class="select md:w-56">${subjectOptions}</select>
        </div>

        <div id="editor-pane" class="grid md:grid-cols-2 gap-4">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Markdown</span>
              <span id="save-status" class="text-slate-400">${note ? 'Saved' : 'Not saved yet'}</span>
            </div>
            <textarea id="note-content" class="textarea font-mono text-sm" rows="20" placeholder="# Your note&#10;&#10;Start typing markdown... support for **bold**, *italic*, inline code, [links](url), lists, headings, &gt; quotes, --- rules, and fenced code blocks.">${escapeHtml(initialContent)}</textarea>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400 mb-1.5">Preview</div>
            <div id="preview" class="prose-md card p-4 min-h-[200px] overflow-auto" style="max-height: 60vh"></div>
          </div>
        </div>

        ${note ? `<div class="text-xs text-slate-400">Last updated ${escapeHtml(formatDateTime(note.updatedAt))}</div>` : ''}
      </div>
    </div>
  `;

  return {
    title: note ? 'Edit note' : 'New note',
    content,
    headerActions,
    onMount: (root) => {
      const titleInput = root.querySelector('#note-title');
      const subjectSelect = root.querySelector('#note-subject');
      const contentInput = root.querySelector('#note-content');
      const preview = root.querySelector('#preview');
      const saveStatus = root.querySelector('#save-status');
      const editorPane = root.querySelector('#editor-pane');
      const togglePreview = root.querySelector('#toggle-preview');
      const deleteBtn = root.querySelector('#delete-note');

      let currentId = note?.id || null;
      let editorMode = 'split'; // 'split' | 'edit' | 'preview'

      const updatePreview = () => { preview.innerHTML = renderMarkdown(contentInput.value); };
      updatePreview();

      const persist = debounce(() => {
        const title = titleInput.value.trim();
        const subjectId = subjectSelect.value || null;
        const text = contentInput.value;
        const now = new Date().toISOString();
        update((d) => {
          if (!currentId) {
            currentId = uid('note');
            d.notes.push({ id: currentId, subjectId, title, content: text, createdAt: now, updatedAt: now });
            // Update URL without navigation
            history.replaceState(null, '', `#/notes/${currentId}`);
          } else {
            const idx = d.notes.findIndex((n) => n.id === currentId);
            if (idx >= 0) d.notes[idx] = { ...d.notes[idx], subjectId, title, content: text, updatedAt: now };
          }
        });
        if (saveStatus) saveStatus.textContent = 'Saved';
      }, 400);

      const onChange = () => {
        if (saveStatus) saveStatus.textContent = 'Saving…';
        persist();
      };
      titleInput.addEventListener('input', onChange);
      subjectSelect.addEventListener('change', onChange);
      contentInput.addEventListener('input', () => { onChange(); updatePreview(); });

      togglePreview.addEventListener('click', () => {
        editorMode = editorMode === 'split' ? 'preview' : 'split';
        if (editorMode === 'preview') {
          editorPane.classList.remove('md:grid-cols-2');
          editorPane.classList.add('md:grid-cols-1');
          editorPane.children[0].classList.add('hidden');
          togglePreview.innerHTML = `${icon('edit', { size: 16 })} Edit`;
        } else {
          editorPane.classList.add('md:grid-cols-2');
          editorPane.classList.remove('md:grid-cols-1');
          editorPane.children[0].classList.remove('hidden');
          togglePreview.innerHTML = `${icon('search', { size: 16 })} Preview`;
        }
      });

      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          const ok = await confirmDialog('Delete this note?', { danger: true, okText: 'Delete' });
          if (!ok) return;
          update((d) => { d.notes = d.notes.filter((n) => n.id !== currentId); });
          toast('Note deleted');
          navigate('/notes');
        });
      }
    },
  };
}
