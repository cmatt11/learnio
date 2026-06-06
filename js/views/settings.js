// Settings view

import { getState, update, applyTheme, exportData, importData, resetData } from '../state.js';
import { icon } from '../components/icons.js';
import { escapeHtml, toast, confirmDialog } from '../utils.js';

export function renderSettings() {
  const state = getState();
  const theme = state.settings.theme || 'system';

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6">
      <section class="card p-5">
        <h3 class="font-semibold mb-2">Profile</h3>
        <label class="text-sm text-slate-500 dark:text-slate-400 block mb-1.5">Your name</label>
        <input id="name-input" class="input max-w-xs" type="text" maxlength="40"
               placeholder="Your name" value="${escapeHtml(state.settings.userName || '')}" />
        <p class="text-xs text-slate-400 mt-2">Used to greet you on the dashboard.</p>
      </section>

      <section class="card p-5">
        <h3 class="font-semibold mb-4">Appearance</h3>
        <div class="grid grid-cols-3 gap-2">
          ${['light', 'dark', 'system'].map((t) => `
            <button class="theme-option btn ${theme === t ? 'btn-primary' : 'btn-secondary'}" data-theme="${t}">
              ${t === 'light' ? icon('sun', { size: 16 }) : t === 'dark' ? icon('moon', { size: 16 }) : icon('settings', { size: 16 })}
              <span class="capitalize">${t}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="card p-5">
        <h3 class="font-semibold mb-2">Data</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Your data is stored locally in this browser. Export to back it up or move to another device.
        </p>
        <div class="flex flex-wrap gap-2">
          <button id="export-btn" class="btn btn-secondary">${icon('download', { size: 16 })} Export JSON</button>
          <button id="import-btn" class="btn btn-secondary">${icon('upload', { size: 16 })} Import JSON</button>
          <input type="file" id="import-file" accept="application/json,.json" class="hidden" />
          <button id="reset-btn" class="btn btn-ghost text-rose-600 ml-auto">${icon('trash', { size: 16 })} Reset all data</button>
        </div>
      </section>

      <section class="card p-5">
        <h3 class="font-semibold mb-3">About</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          <strong>Learnio v1</strong> — Your all-in-one learning ecosystem.
        </p>
        <p class="text-xs text-slate-400 mt-2">Notes, flashcards, tasks, schedule, pomodoro — everything you need to study smarter.</p>
      </section>
    </div>
  `;

  return {
    title: 'Settings',
    content,
    onMount: (root) => {
      const nameInput = root.querySelector('#name-input');
      if (nameInput) {
        const saveName = () => {
          const name = (nameInput.value || '').trim().slice(0, 40);
          update((d) => { d.settings.userName = name; d.settings.namePrompted = true; });
        };
        nameInput.addEventListener('change', saveName);
        nameInput.addEventListener('blur', saveName);
      }

      root.querySelectorAll('.theme-option').forEach((b) => b.addEventListener('click', () => {
        const t = b.dataset.theme;
        update((d) => { d.settings.theme = t; });
        applyTheme(t);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }));

      root.querySelector('#export-btn')?.addEventListener('click', () => {
        const blob = new Blob([exportData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learnio-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast('Data exported', { type: 'success' });
      });

      const fileInput = root.querySelector('#import-file');
      root.querySelector('#import-btn')?.addEventListener('click', () => fileInput.click());
      fileInput?.addEventListener('change', async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        try {
          const text = await f.text();
          importData(text);
          toast('Data imported', { type: 'success' });
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (e) {
          toast('Import failed: ' + e.message, { type: 'error' });
        }
        fileInput.value = '';
      });

      root.querySelector('#reset-btn')?.addEventListener('click', async () => {
        const ok = await confirmDialog('Erase ALL Learnio data? This cannot be undone.', { danger: true, okText: 'Erase everything' });
        if (!ok) return;
        resetData();
        toast('All data erased');
        location.hash = '#/';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    },
  };
}
