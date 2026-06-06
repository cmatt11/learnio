// Generic utilities

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const cls = (...parts) => parts.filter(Boolean).join(' ');

// Date helpers

export const ymd = (d = new Date()) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const today = () => ymd(new Date());

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const relativeDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startTarget - startToday) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 6) return d.toLocaleDateString(undefined, { weekday: 'long' });
  if (diff < 0 && diff >= -6) return `${-diff} days ago`;
  return formatDateShort(iso);
};

export const daysBetween = (a, b) => {
  const aD = new Date(a);
  const bD = new Date(b);
  const aT = new Date(aD.getFullYear(), aD.getMonth(), aD.getDate()).getTime();
  const bT = new Date(bD.getFullYear(), bD.getMonth(), bD.getDate()).getTime();
  return Math.round((bT - aT) / (24 * 60 * 60 * 1000));
};

export const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
};

// HH:MM helpers
export const minutesToHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export const hhmmToMinutes = (s) => {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const formatDuration = (mins) => {
  if (!mins || mins < 1) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// Toast notifications
export const toast = (message, opts = {}) => {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (opts.type === 'error') el.style.background = '#dc2626';
  if (opts.type === 'success') el.style.background = '#059669';
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 200);
  }, opts.duration || 2500);
};

// Confirm dialog (returns Promise<boolean>)
export const confirmDialog = (message, opts = {}) => new Promise((resolve) => {
  const root = document.getElementById('modal-root');
  if (!root) return resolve(window.confirm(message));
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="backdrop" data-cancel></div>
    <div class="modal">
      <div class="card scale-in p-6 max-w-sm w-full">
        <p class="text-base mb-5">${escapeHtml(message)}</p>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost" data-cancel>${escapeHtml(opts.cancelText || 'Cancel')}</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(opts.okText || 'OK')}</button>
        </div>
      </div>
    </div>`;
  root.appendChild(wrap);
  const cleanup = (val) => { wrap.remove(); resolve(val); };
  wrap.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => cleanup(false)));
  wrap.querySelector('[data-ok]').addEventListener('click', () => cleanup(true));
});

// Debounce
export const debounce = (fn, ms = 250) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Color palette for subjects
export const SUBJECT_COLORS = [
  { name: 'indigo', value: '#6366f1' },
  { name: 'rose', value: '#f43f5e' },
  { name: 'emerald', value: '#10b981' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'sky', value: '#0ea5e9' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'pink', value: '#ec4899' },
  { name: 'teal', value: '#14b8a6' },
  { name: 'orange', value: '#f97316' },
  { name: 'slate', value: '#64748b' },
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
