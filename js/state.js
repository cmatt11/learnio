// Reactive state + localStorage persistence

const STORAGE_KEY = 'learnio:data:v1';
const SCHEMA_VERSION = 1;

const defaultData = () => ({
  schemaVersion: SCHEMA_VERSION,
  subjects: [],
  notes: [],
  decks: [],
  cards: [],
  tasks: [],
  scheduleEvents: [],
  studySessions: [],
  settings: {
    theme: 'system',
    pomodoro: { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 },
    planner: { dayStart: '08:00', dayEnd: '21:00', breakEvery: 90, breakLen: 15, defaultDuration: 45 },
    onboarded: false,
  },
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Light migration safety - merge missing keys
    return { ...defaultData(), ...parsed, settings: { ...defaultData().settings, ...(parsed.settings || {}) } };
  } catch (e) {
    console.warn('Failed to load state, using defaults', e);
    return defaultData();
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

const listeners = new Set();
let data = load();

export const getState = () => data;

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

export function update(mutator) {
  // Mutator gets a draft copy; we shallow clone collections that change
  const next = { ...data };
  // Clone collections so reducers can mutate freely
  for (const key of ['subjects', 'notes', 'decks', 'cards', 'tasks', 'scheduleEvents', 'studySessions']) {
    next[key] = [...data[key]];
  }
  next.settings = { ...data.settings, pomodoro: { ...data.settings.pomodoro }, planner: { ...data.settings.planner } };
  mutator(next);
  data = next;
  save(data);
  notify();
}

// Theme management
export function applyTheme(theme = data.settings.theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem('learnio:theme', theme); } catch (e) {}
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (data.settings.theme === 'system') applyTheme('system');
});

// Reset / export / import - utility methods
export function exportData() {
  return JSON.stringify(data, null, 2);
}

export function importData(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
  data = { ...defaultData(), ...parsed, settings: { ...defaultData().settings, ...(parsed.settings || {}) } };
  save(data);
  notify();
}

export function resetData() {
  data = defaultData();
  save(data);
  notify();
}

// Seed sample data on first run for nicer empty experience
export function seedIfEmpty() {
  if (data.subjects.length || data.tasks.length || data.notes.length) return;
  const now = new Date().toISOString();
  const mathId = 'sub_math_demo';
  const histId = 'sub_hist_demo';
  const csId = 'sub_cs_demo';

  update((d) => {
    d.subjects.push(
      { id: mathId, name: 'Calculus II', color: '#6366f1', icon: 'sigma', createdAt: now },
      { id: histId, name: 'World History', color: '#f59e0b', icon: 'book', createdAt: now },
      { id: csId, name: 'Computer Science', color: '#10b981', icon: 'code', createdAt: now }
    );

    d.notes.push({
      id: 'note_demo_1',
      subjectId: mathId,
      title: 'Integration techniques',
      content: '# Integration techniques\n\n- **u-substitution**: choose `u` so `du` simplifies the integrand\n- **Integration by parts**: $\\int u\\,dv = uv - \\int v\\,du$\n- **Partial fractions** for rational functions\n\n> Practice with mixed problem sets weekly.',
      createdAt: now,
      updatedAt: now,
    });

    const deckId = 'deck_demo_1';
    d.decks.push({
      id: deckId,
      subjectId: mathId,
      name: 'Calc II - Key Formulas',
      description: 'Core integration and series formulas',
      createdAt: now,
    });

    const today = new Date().toISOString();
    d.cards.push(
      { id: 'card_d1', deckId, front: 'Power rule for integration', back: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C, n ≠ -1', ease: 2.5, interval: 0, repetitions: 0, dueDate: today, createdAt: now },
      { id: 'card_d2', deckId, front: '∫ sin(x) dx', back: '-cos(x) + C', ease: 2.5, interval: 0, repetitions: 0, dueDate: today, createdAt: now },
      { id: 'card_d3', deckId, front: '∫ cos(x) dx', back: 'sin(x) + C', ease: 2.5, interval: 0, repetitions: 0, dueDate: today, createdAt: now },
      { id: 'card_d4', deckId, front: '∫ 1/x dx', back: 'ln|x| + C', ease: 2.5, interval: 0, repetitions: 0, dueDate: today, createdAt: now }
    );

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const inThree = new Date(); inThree.setDate(inThree.getDate() + 3);
    const inSeven = new Date(); inSeven.setDate(inSeven.getDate() + 7);

    d.tasks.push(
      { id: 'task_demo_1', subjectId: mathId, title: 'Problem set 5 (sections 7.1-7.3)', notes: '', dueDate: tomorrow.toISOString().slice(0, 10), priority: 'high', completed: false, createdAt: now },
      { id: 'task_demo_2', subjectId: histId, title: 'Read chapter 12', notes: '', dueDate: inThree.toISOString().slice(0, 10), priority: 'med', completed: false, createdAt: now },
      { id: 'task_demo_3', subjectId: csId, title: 'Lab 4: linked lists', notes: '', dueDate: inSeven.toISOString().slice(0, 10), priority: 'med', completed: false, createdAt: now }
    );

    d.scheduleEvents.push(
      { id: 'evt_demo_1', subjectId: mathId, title: 'Calc II Lecture', day: 1, startTime: '09:00', endTime: '10:15', location: 'Room 204' },
      { id: 'evt_demo_2', subjectId: mathId, title: 'Calc II Lecture', day: 3, startTime: '09:00', endTime: '10:15', location: 'Room 204' },
      { id: 'evt_demo_3', subjectId: histId, title: 'World History', day: 2, startTime: '11:00', endTime: '12:15', location: 'Hall A' },
      { id: 'evt_demo_4', subjectId: csId, title: 'CS Lab', day: 4, startTime: '14:00', endTime: '16:00', location: 'CS Building 110' }
    );

    d.settings.onboarded = true;
  });
}
