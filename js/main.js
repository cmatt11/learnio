// Learnio main entry

import { applyTheme, seedIfEmpty, subscribe, getState } from './state.js';
import { route, start, getMatch } from './router.js';
import { renderLayout, attachLayoutHandlers } from './components/layout.js';

import { renderDashboard } from './views/dashboard.js';
import { renderSubjects, renderSubjectDetail } from './views/subjects.js';
import { renderNotes, renderNoteEditor } from './views/notes.js';
import { renderFlashcards, renderDeck, renderStudy } from './views/flashcards.js';
import { renderTasks } from './views/tasks.js';
import { renderSchedule } from './views/schedule.js';
import { renderPomodoro } from './views/pomodoro.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';

const app = document.getElementById('app');

let currentView = null;
let currentCleanup = null;

function mountView(view) {
  // view = { title, subtitle?, content, headerActions?, onMount?, cleanup? }
  if (currentCleanup) {
    try { currentCleanup(); } catch (e) {}
    currentCleanup = null;
  }
  app.innerHTML = renderLayout(view);
  attachLayoutHandlers(app);
  if (view.onMount) {
    const c = view.onMount(app);
    if (typeof c === 'function') currentCleanup = c;
  }
  currentView = view;
  // Scroll to top on nav
  const main = app.querySelector('main');
  if (main) main.scrollTop = 0;
}

// Route registration
route('/', () => mountView(renderDashboard()));
route('/subjects', () => mountView(renderSubjects()));
route('/subjects/:id', ({ params }) => mountView(renderSubjectDetail(params.id)));
route('/notes', () => mountView(renderNotes()));
route('/notes/new', ({ query }) => mountView(renderNoteEditor(null, query.subject)));
route('/notes/:id', ({ params }) => mountView(renderNoteEditor(params.id)));
route('/flashcards', () => mountView(renderFlashcards()));
route('/flashcards/:id', ({ params }) => mountView(renderDeck(params.id)));
route('/flashcards/:id/study', ({ params }) => mountView(renderStudy(params.id)));
route('/tasks', () => mountView(renderTasks()));
route('/schedule', () => mountView(renderSchedule()));
route('/pomodoro', () => mountView(renderPomodoro()));
route('/stats', () => mountView(renderStats()));
route('/settings', () => mountView(renderSettings()));

// Initial setup
applyTheme();
seedIfEmpty();

// Re-render on state changes (only for non-input-heavy views, otherwise views handle their own updates)
let lastRenderHash = '';
subscribe(() => {
  // Trigger a soft re-render only when route handler explicitly opts in (signaled by `data-rerender` attr on root)
  if (app.dataset.rerender === 'auto') {
    const match = getMatch();
    if (match) {
      // Trigger by re-handling the current route via hashchange-like dispatch
      const evt = new HashChangeEvent('hashchange');
      window.dispatchEvent(evt);
    }
  }
});

start();
