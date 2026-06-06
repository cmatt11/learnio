// Reusable modal helper

import { icon } from './icons.js';
import { escapeHtml } from '../utils.js';

export function openModal({ title, content, footer, onMount, size = 'md' }) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="backdrop" data-close></div>
    <div class="modal">
      <div class="card scale-in w-full ${sizes[size] || sizes.md} max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-bold">${escapeHtml(title || '')}</h2>
          <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x', { size: 18 })}</button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-5">${content || ''}</div>
        ${footer ? `<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">${footer}</div>` : ''}
      </div>
    </div>
  `;
  root.appendChild(wrap);

  const close = () => wrap.remove();
  wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  if (onMount) onMount(wrap, close);
  return close;
}
