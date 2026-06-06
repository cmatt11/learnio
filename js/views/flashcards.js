// Flashcards view (decks list, deck detail, study mode with SM-2 spaced repetition)

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { navigate } from '../router.js';
import { escapeHtml, uid, toast, confirmDialog, today, ymd, addDays } from '../utils.js';

// SM-2 algorithm. Quality: 0=Again, 3=Hard, 4=Good, 5=Easy
function sm2(card, quality) {
  let { ease = 2.5, interval = 0, repetitions = 0 } = card;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetitions += 1;
  }
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;
  const dueDate = ymd(addDays(new Date(), interval));
  return { ease, interval, repetitions, dueDate };
}

export function renderFlashcards() {
  const state = getState();
  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const headerActions = `<button id="new-deck" class="btn btn-primary">${icon('plus', { size: 16 })} New deck</button>`;

  const deckCards = state.decks.map((d) => {
    const cards = state.cards.filter((c) => c.deckId === d.id);
    const due = cards.filter((c) => (c.dueDate || '0') <= today()).length;
    const subj = d.subjectId ? subjectById[d.subjectId] : null;
    return `
      <div class="card p-5 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            ${subj ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: ${escapeHtml(subj.color)}"></span>` : ''}
            <h3 class="font-semibold truncate">${escapeHtml(d.name)}</h3>
          </div>
          <button class="btn btn-ghost btn-icon delete-deck text-slate-400 hover:text-rose-600" data-id="${escapeHtml(d.id)}" aria-label="Delete deck">${icon('trash', { size: 16 })}</button>
        </div>
        ${d.description ? `<p class="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">${escapeHtml(d.description)}</p>` : ''}
        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between mb-4">
          <span>${cards.length} card${cards.length === 1 ? '' : 's'}</span>
          <span class="${due > 0 ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}">${due} due</span>
        </div>
        <div class="flex gap-2">
          <a href="#/flashcards/${encodeURIComponent(d.id)}" class="btn btn-secondary flex-1">${icon('edit', { size: 14 })} Manage</a>
          ${cards.length ? `<a href="#/flashcards/${encodeURIComponent(d.id)}/study" class="btn btn-primary flex-1">${icon('play', { size: 14 })} Study</a>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      ${state.decks.length === 0 ? `
        <div class="empty">
          ${icon('cards', { size: 48, class: 'mx-auto mb-3 opacity-40' })}
          <p class="font-medium mb-1">No flashcard decks yet</p>
          <p class="text-sm mb-4">Create decks to study with spaced repetition.</p>
          <button id="new-deck-empty" class="btn btn-primary">${icon('plus', { size: 16 })} Create your first deck</button>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${deckCards}</div>
      `}
    </div>
  `;

  return {
    title: 'Flashcards',
    subtitle: state.decks.length ? `${state.decks.length} ${state.decks.length === 1 ? 'deck' : 'decks'}` : '',
    content,
    headerActions,
    onMount: (root) => {
      root.querySelector('#new-deck')?.addEventListener('click', () => openDeckEditor());
      root.querySelector('#new-deck-empty')?.addEventListener('click', () => openDeckEditor());
      root.querySelectorAll('.delete-deck').forEach((b) => {
        b.addEventListener('click', async (e) => {
          e.preventDefault();
          const did = b.dataset.id;
          const deck = getState().decks.find((d) => d.id === did);
          if (!deck) return;
          const ok = await confirmDialog(`Delete deck "${deck.name}" and all its cards?`, { danger: true, okText: 'Delete' });
          if (!ok) return;
          update((d) => {
            d.decks = d.decks.filter((x) => x.id !== did);
            d.cards = d.cards.filter((c) => c.deckId !== did);
          });
          toast('Deck deleted');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
      });
    },
  };
}

export function renderDeck(id) {
  const state = getState();
  const deck = state.decks.find((d) => d.id === id);
  if (!deck) {
    return { title: 'Deck not found', content: `<div class="px-8 py-12 text-center"><a class="btn btn-primary" href="#/flashcards">Back to decks</a></div>` };
  }
  const cards = state.cards.filter((c) => c.deckId === id);
  const due = cards.filter((c) => (c.dueDate || '0') <= today()).length;

  const headerActions = `
    ${cards.length ? `<a href="#/flashcards/${encodeURIComponent(id)}/study" class="btn btn-primary">${icon('play', { size: 16 })} Study${due ? ' (' + due + ' due)' : ''}</a>` : ''}
    <button id="add-card" class="btn btn-secondary">${icon('plus', { size: 16 })} Add card</button>
  `;

  const cardRows = cards.map((c) => `
    <li class="card p-4 flex items-start gap-3">
      <div class="flex-1 grid md:grid-cols-2 gap-3 min-w-0">
        <div class="text-sm">
          <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Front</div>
          <div class="break-words whitespace-pre-wrap">${escapeHtml(c.front)}</div>
        </div>
        <div class="text-sm">
          <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Back</div>
          <div class="break-words whitespace-pre-wrap">${escapeHtml(c.back)}</div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn btn-ghost btn-icon edit-card" data-id="${escapeHtml(c.id)}" aria-label="Edit">${icon('edit', { size: 16 })}</button>
        <button class="btn btn-ghost btn-icon delete-card text-rose-600" data-id="${escapeHtml(c.id)}" aria-label="Delete">${icon('trash', { size: 16 })}</button>
      </div>
    </li>
  `).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-4xl mx-auto space-y-4">
      <a href="#/flashcards" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">${icon('arrow_left', { size: 14 })} All decks</a>

      <div class="card p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center">${icon('cards', { size: 22 })}</div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold truncate">${escapeHtml(deck.name)}</h2>
          ${deck.description ? `<p class="text-sm text-slate-500 dark:text-slate-400 truncate">${escapeHtml(deck.description)}</p>` : ''}
          <div class="text-xs text-slate-400 mt-1">${cards.length} cards · ${due} due today</div>
        </div>
        <button id="edit-deck" class="btn btn-ghost btn-icon" aria-label="Edit deck">${icon('edit', { size: 18 })}</button>
      </div>

      ${cards.length === 0 ? `
        <div class="empty">
          <p class="font-medium mb-1">No cards yet</p>
          <p class="text-sm mb-4">Add some cards to start studying.</p>
          <button id="add-card-empty" class="btn btn-primary">${icon('plus', { size: 16 })} Add a card</button>
        </div>
      ` : `<ul class="space-y-2">${cardRows}</ul>`}
    </div>
  `;

  return {
    title: deck.name,
    subtitle: 'Deck',
    content,
    headerActions,
    onMount: (root) => {
      root.querySelector('#add-card')?.addEventListener('click', () => openCardEditor(id, null));
      root.querySelector('#add-card-empty')?.addEventListener('click', () => openCardEditor(id, null));
      root.querySelector('#edit-deck')?.addEventListener('click', () => openDeckEditor(deck));
      root.querySelectorAll('.edit-card').forEach((b) => b.addEventListener('click', () => {
        const c = getState().cards.find((x) => x.id === b.dataset.id);
        if (c) openCardEditor(id, c);
      }));
      root.querySelectorAll('.delete-card').forEach((b) => b.addEventListener('click', async () => {
        const ok = await confirmDialog('Delete this card?', { danger: true, okText: 'Delete' });
        if (!ok) return;
        update((d) => { d.cards = d.cards.filter((c) => c.id !== b.dataset.id); });
        toast('Card deleted');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }));
    },
  };
}

export function renderStudy(deckId) {
  const state = getState();
  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) {
    return { title: 'Deck not found', content: `<div class="px-8 py-12 text-center"><a class="btn btn-primary" href="#/flashcards">Back</a></div>` };
  }
  const allCards = state.cards.filter((c) => c.deckId === deckId);
  const dueCards = allCards.filter((c) => (c.dueDate || '0') <= today());
  // Use due cards if any, otherwise fall back to all cards (let user practice)
  const queue = dueCards.length ? [...dueCards] : [...allCards];
  // shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <a href="#/flashcards/${encodeURIComponent(deckId)}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4">${icon('arrow_left', { size: 14 })} Back to deck</a>
      <div id="study-area"></div>
    </div>
  `;

  return {
    title: `Studying: ${deck.name}`,
    subtitle: dueCards.length ? `${dueCards.length} due` : 'All cards (practice)',
    content,
    onMount: (root) => {
      const area = root.querySelector('#study-area');
      let idx = 0;
      let stats = { again: 0, hard: 0, good: 0, easy: 0 };

      const renderDone = () => {
        area.innerHTML = `
          <div class="card p-8 text-center scale-in">
            <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center mb-4">
              ${icon('check', { size: 28 })}
            </div>
            <h3 class="text-2xl font-bold mb-2">Session complete!</h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">You reviewed ${queue.length} card${queue.length === 1 ? '' : 's'}.</p>
            <div class="grid grid-cols-4 gap-2 max-w-md mx-auto mb-6 text-sm">
              <div class="card p-3"><div class="font-bold text-rose-500">${stats.again}</div><div class="text-xs text-slate-500">Again</div></div>
              <div class="card p-3"><div class="font-bold text-amber-500">${stats.hard}</div><div class="text-xs text-slate-500">Hard</div></div>
              <div class="card p-3"><div class="font-bold text-emerald-500">${stats.good}</div><div class="text-xs text-slate-500">Good</div></div>
              <div class="card p-3"><div class="font-bold text-sky-500">${stats.easy}</div><div class="text-xs text-slate-500">Easy</div></div>
            </div>
            <div class="flex gap-2 justify-center">
              <a href="#/flashcards/${encodeURIComponent(deckId)}" class="btn btn-secondary">Back to deck</a>
              <a href="#/flashcards" class="btn btn-primary">All decks</a>
            </div>
          </div>
        `;
      };

      const renderCard = () => {
        if (queue.length === 0) {
          area.innerHTML = `
            <div class="card p-8 text-center">
              <p class="font-medium mb-2">No cards to study right now.</p>
              <p class="text-sm text-slate-500 mb-4">Add some cards to this deck.</p>
              <a href="#/flashcards/${encodeURIComponent(deckId)}" class="btn btn-primary">Manage deck</a>
            </div>
          `;
          return;
        }
        if (idx >= queue.length) { renderDone(); return; }
        const card = queue[idx];
        const progress = Math.round((idx / queue.length) * 100);
        area.innerHTML = `
          <div class="space-y-4 fade-in">
            <div class="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style="width: ${progress}%"></div>
            </div>
            <div class="text-xs text-slate-500 text-center">Card ${idx + 1} of ${queue.length}</div>

            <div class="flip-card cursor-pointer" id="flip-card" style="height: 320px">
              <div class="flip-card-inner">
                <div class="flip-card-front card p-8">
                  <div class="text-center w-full">
                    <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Question</div>
                    <div class="text-xl md:text-2xl font-medium whitespace-pre-wrap">${escapeHtml(card.front)}</div>
                    <div class="text-xs text-slate-400 mt-6">Click to reveal answer</div>
                  </div>
                </div>
                <div class="flip-card-back card p-8 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/30 dark:to-slate-900 border-brand-200 dark:border-brand-800">
                  <div class="text-center w-full">
                    <div class="text-[10px] uppercase tracking-wider text-brand-500 mb-3">Answer</div>
                    <div class="text-xl md:text-2xl font-medium whitespace-pre-wrap">${escapeHtml(card.back)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div id="grade-row" class="hidden grid grid-cols-4 gap-2">
              <button class="btn btn-secondary flex-col h-auto py-3 hover:!bg-rose-50 dark:hover:!bg-rose-900/30" data-quality="0">
                <span class="font-bold">Again</span>
                <span class="text-[10px] text-slate-500">&lt; 1 min</span>
              </button>
              <button class="btn btn-secondary flex-col h-auto py-3 hover:!bg-amber-50 dark:hover:!bg-amber-900/30" data-quality="3">
                <span class="font-bold">Hard</span>
                <span class="text-[10px] text-slate-500">~ ${formatInterval(card, 3)}</span>
              </button>
              <button class="btn btn-secondary flex-col h-auto py-3 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30" data-quality="4">
                <span class="font-bold">Good</span>
                <span class="text-[10px] text-slate-500">~ ${formatInterval(card, 4)}</span>
              </button>
              <button class="btn btn-secondary flex-col h-auto py-3 hover:!bg-sky-50 dark:hover:!bg-sky-900/30" data-quality="5">
                <span class="font-bold">Easy</span>
                <span class="text-[10px] text-slate-500">~ ${formatInterval(card, 5)}</span>
              </button>
            </div>
          </div>
        `;

        const flipCard = area.querySelector('#flip-card');
        const gradeRow = area.querySelector('#grade-row');
        let revealed = false;
        const reveal = () => {
          if (revealed) return;
          revealed = true;
          flipCard.classList.add('flipped');
          gradeRow.classList.remove('hidden');
        };
        flipCard.addEventListener('click', reveal);
        const onKey = (e) => {
          if (e.code === 'Space') { e.preventDefault(); reveal(); }
          if (revealed) {
            if (e.key === '1') gradeRow.querySelector('[data-quality="0"]')?.click();
            if (e.key === '2') gradeRow.querySelector('[data-quality="3"]')?.click();
            if (e.key === '3') gradeRow.querySelector('[data-quality="4"]')?.click();
            if (e.key === '4') gradeRow.querySelector('[data-quality="5"]')?.click();
          }
        };
        document.addEventListener('keydown', onKey);

        gradeRow.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
          if (!revealed) return;
          const q = Number(b.dataset.quality);
          if (q === 0) stats.again++; else if (q === 3) stats.hard++; else if (q === 4) stats.good++; else stats.easy++;
          const updated = sm2(card, q);
          update((d) => {
            const i = d.cards.findIndex((c) => c.id === card.id);
            if (i >= 0) d.cards[i] = { ...d.cards[i], ...updated };
          });
          document.removeEventListener('keydown', onKey);
          idx++;
          renderCard();
        }));
      };

      renderCard();
    },
  };
}

function formatInterval(card, quality) {
  const updated = sm2(card, quality);
  if (updated.interval < 1) return '< 1d';
  if (updated.interval === 1) return '1 day';
  if (updated.interval < 30) return `${updated.interval} days`;
  if (updated.interval < 365) return `${Math.round(updated.interval / 30)} mo`;
  return `${Math.round(updated.interval / 365)} y`;
}

function openDeckEditor(existing = null) {
  const isEdit = !!existing;
  const state = getState();
  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}" ${existing?.subjectId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');

  openModal({
    title: isEdit ? 'Edit deck' : 'New deck',
    content: `
      <form id="deck-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Deck name</label>
          <input name="name" class="input" placeholder="e.g. Spanish Vocabulary" value="${escapeHtml(existing?.name || '')}" required autofocus />
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Subject (optional)</label>
          <select name="subjectId" class="select">${subjectOptions}</select>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Description (optional)</label>
          <textarea name="description" class="textarea" rows="2" placeholder="Short description">${escapeHtml(existing?.description || '')}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="save">${isEdit ? 'Save' : 'Create'}</button>
    `,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#deck-form');
      const submit = (e) => {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        if (!name) { toast('Name is required', { type: 'error' }); return; }
        const subjectId = String(fd.get('subjectId') || '') || null;
        const description = String(fd.get('description') || '').trim();
        update((d) => {
          if (isEdit) {
            const i = d.decks.findIndex((x) => x.id === existing.id);
            if (i >= 0) d.decks[i] = { ...d.decks[i], name, subjectId, description };
          } else {
            d.decks.push({ id: uid('deck'), name, subjectId, description, createdAt: new Date().toISOString() });
          }
        });
        toast(isEdit ? 'Deck updated' : 'Deck created', { type: 'success' });
        close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      form.addEventListener('submit', submit);
      wrap.querySelector('#save').addEventListener('click', submit);
    },
  });
}

function openCardEditor(deckId, existing) {
  const isEdit = !!existing;
  openModal({
    title: isEdit ? 'Edit card' : 'New card',
    content: `
      <form id="card-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Front (question)</label>
          <textarea name="front" class="textarea" rows="3" required autofocus>${escapeHtml(existing?.front || '')}</textarea>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Back (answer)</label>
          <textarea name="back" class="textarea" rows="3" required>${escapeHtml(existing?.back || '')}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${!isEdit ? `<button class="btn btn-secondary" id="save-add">Save & add another</button>` : ''}
      <button class="btn btn-primary" id="save">${isEdit ? 'Save' : 'Save'}</button>
    `,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#card-form');
      const persist = () => {
        const fd = new FormData(form);
        const front = String(fd.get('front') || '').trim();
        const back = String(fd.get('back') || '').trim();
        if (!front || !back) { toast('Front and back are required', { type: 'error' }); return false; }
        const now = new Date().toISOString();
        update((d) => {
          if (isEdit) {
            const i = d.cards.findIndex((c) => c.id === existing.id);
            if (i >= 0) d.cards[i] = { ...d.cards[i], front, back };
          } else {
            d.cards.push({
              id: uid('card'), deckId, front, back,
              ease: 2.5, interval: 0, repetitions: 0,
              dueDate: today(), createdAt: now,
            });
          }
        });
        return true;
      };
      const finish = (closeAfter = true) => {
        if (!persist()) return;
        toast(isEdit ? 'Card updated' : 'Card added', { type: 'success' });
        if (closeAfter) close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); finish(); });
      wrap.querySelector('#save').addEventListener('click', () => finish());
      wrap.querySelector('#save-add')?.addEventListener('click', () => {
        if (persist()) {
          toast('Card added', { type: 'success' });
          form.reset();
          form.querySelector('[name="front"]').focus();
        }
      });
    },
  });
}
