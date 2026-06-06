// App layout: sidebar + header

import { icon } from './icons.js';
import { getState, applyTheme, update } from '../state.js';
import { getMatch } from '../router.js';
import { escapeHtml } from '../utils.js';

const NAV = [
  { path: '/', label: 'Dashboard', icon: 'home' },
  { path: '/subjects', label: 'Subjects', icon: 'layers' },
  { path: '/notes', label: 'Notes', icon: 'notes' },
  { path: '/flashcards', label: 'Flashcards', icon: 'cards' },
  { path: '/tasks', label: 'Tasks', icon: 'tasks' },
  { path: '/schedule', label: 'Schedule', icon: 'schedule' },
  { path: '/pomodoro', label: 'Pomodoro', icon: 'timer' },
  { path: '/stats', label: 'Stats', icon: 'chart' },
];

const isActive = (path, currentPath) => {
  if (path === '/') return currentPath === '/' || currentPath === '';
  return currentPath === path || currentPath.startsWith(path + '/');
};

export function renderLayout({ title, content, headerActions = '', subtitle = '' }) {
  const state = getState();
  const match = getMatch();
  const currentPath = match ? match.path : '/';
  const theme = state.settings.theme || 'system';
  const isDark = document.documentElement.classList.contains('dark');

  const navItems = NAV.map((n) => `
    <a href="#${n.path}" class="nav-item ${isActive(n.path, currentPath) ? 'active' : ''}">
      ${icon(n.icon, { size: 18 })}
      <span>${escapeHtml(n.label)}</span>
    </a>
  `).join('');

  return `
    <div class="flex min-h-screen">
      <aside class="sidebar fixed md:static md:translate-x-0 z-40 w-64 h-screen md:h-auto md:min-h-screen flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div class="px-5 py-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            ${icon('graduation_cap', { size: 20, stroke: 'white' })}
          </div>
          <div>
            <div class="font-bold text-lg leading-tight">Learnio</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">Learning ecosystem</div>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          ${navItems}
        </nav>

        <div class="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <a href="#/settings" class="nav-item ${isActive('/settings', currentPath) ? 'active' : ''}">
            ${icon('settings', { size: 18 })}
            <span>Settings</span>
          </a>
          <button id="theme-toggle" class="nav-item w-full text-left">
            ${isDark ? icon('sun', { size: 18 }) : icon('moon', { size: 18 })}
            <span>${isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      <div id="sidebar-backdrop" class="hidden md:hidden fixed inset-0 bg-black/50 z-30"></div>

      <main class="flex-1 min-w-0 flex flex-col">
        <header class="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div class="px-4 md:px-8 h-16 flex items-center gap-4">
            <button id="sidebar-toggle" class="md:hidden btn btn-ghost btn-icon" aria-label="Menu">
              ${icon('menu', { size: 22 })}
            </button>
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-bold truncate">${escapeHtml(title || '')}</h1>
              ${subtitle ? `<p class="text-xs text-slate-500 dark:text-slate-400 truncate">${escapeHtml(subtitle)}</p>` : ''}
            </div>
            <div class="flex items-center gap-2">${headerActions}</div>
          </div>
        </header>

        <div class="flex-1 fade-in">
          ${content}
        </div>
      </main>
    </div>
  `;
}

export function attachLayoutHandlers(root) {
  const themeBtn = root.querySelector('#theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const state = getState();
      const isDark = document.documentElement.classList.contains('dark');
      const next = isDark ? 'light' : 'dark';
      update((d) => { d.settings.theme = next; });
      applyTheme(next);
    });
  }

  const sidebarToggle = root.querySelector('#sidebar-toggle');
  const sidebar = root.querySelector('.sidebar');
  const backdrop = root.querySelector('#sidebar-backdrop');
  if (sidebarToggle && sidebar && backdrop) {
    const open = () => { sidebar.classList.add('open'); backdrop.classList.remove('hidden'); };
    const close = () => { sidebar.classList.remove('open'); backdrop.classList.add('hidden'); };
    sidebarToggle.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    // Close on nav-item click on mobile
    sidebar.querySelectorAll('a.nav-item').forEach((a) => a.addEventListener('click', close));
  }
}
