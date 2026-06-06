// Schedule view - weekly timetable

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { escapeHtml, uid, toast, confirmDialog, hhmmToMinutes, minutesToHHMM, DAY_NAMES, DAY_SHORT } from '../utils.js';

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 56; // px

export function renderSchedule() {
  const state = getState();
  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));

  const headerActions = `<button id="new-event" class="btn btn-primary">${icon('plus', { size: 16 })} Add class</button>`;

  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const eventsByDay = Array.from({ length: 7 }, () => []);
  for (const e of state.scheduleEvents) {
    if (e.day >= 0 && e.day <= 6) eventsByDay[e.day].push(e);
  }
  eventsByDay.forEach((arr) => arr.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));

  const renderDayColumn = (dayIdx) => {
    const events = eventsByDay[dayIdx];
    const blocks = events.map((e) => {
      const startMin = hhmmToMinutes(e.startTime);
      const endMin = Math.max(startMin + 15, hhmmToMinutes(e.endTime));
      const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
      const subj = e.subjectId ? subjectById[e.subjectId] : null;
      const color = subj?.color || '#64748b';
      return `
        <div class="event-block absolute left-1 right-1 rounded-lg border p-1.5 text-xs cursor-pointer overflow-hidden hover:shadow-md transition" 
             style="top: ${top}px; height: ${Math.max(height, 28)}px; background: ${color}1a; border-color: ${color}55; color: ${color};"
             data-id="${escapeHtml(e.id)}">
          <div class="font-semibold truncate" style="color: inherit">${escapeHtml(e.title)}</div>
          <div class="text-[10px] opacity-80 truncate">${escapeHtml(e.startTime)}–${escapeHtml(e.endTime)}</div>
          ${e.location ? `<div class="text-[10px] opacity-70 truncate">${escapeHtml(e.location)}</div>` : ''}
        </div>
      `;
    }).join('');
    return `
      <div class="day-column relative border-l border-slate-200 dark:border-slate-800" data-day="${dayIdx}" style="min-width: 110px">
        ${hours.slice(0, -1).map(() => `<div style="height: ${HOUR_HEIGHT}px" class="border-b border-slate-100 dark:border-slate-800/50"></div>`).join('')}
        ${blocks}
      </div>
    `;
  };

  const today = new Date().getDay();

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <div class="min-w-[820px]">
            <div class="grid sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" style="grid-template-columns: 60px repeat(7, 1fr)">
              <div class="p-2 text-[10px] uppercase tracking-wider text-slate-400">Time</div>
              ${DAY_NAMES.map((n, i) => `
                <div class="p-2 text-center ${i === today ? 'bg-brand-50 dark:bg-brand-900/30' : ''}">
                  <div class="text-[10px] uppercase tracking-wider text-slate-400">${escapeHtml(DAY_SHORT[i])}</div>
                  <div class="text-sm font-semibold ${i === today ? 'text-brand-600 dark:text-brand-400' : ''}">${escapeHtml(n)}</div>
                </div>
              `).join('')}
            </div>
            <div class="grid" style="grid-template-columns: 60px repeat(7, 1fr)">
              <div class="border-r border-slate-200 dark:border-slate-800">
                ${hours.slice(0, -1).map((h) => `
                  <div style="height: ${HOUR_HEIGHT}px" class="text-[10px] text-slate-400 px-2 pt-0.5 border-b border-slate-100 dark:border-slate-800/50">${String(h).padStart(2,'0')}:00</div>
                `).join('')}
              </div>
              ${[0,1,2,3,4,5,6].map((d) => renderDayColumn(d)).join('')}
            </div>
          </div>
        </div>
      </div>

      ${state.scheduleEvents.length === 0 ? `
        <div class="empty mt-6">
          <p class="font-medium mb-1">No classes scheduled yet</p>
          <p class="text-sm">Add your weekly classes to see them in the timetable.</p>
        </div>
      ` : ''}
    </div>
  `;

  return {
    title: 'Schedule',
    subtitle: `${state.scheduleEvents.length} ${state.scheduleEvents.length === 1 ? 'class' : 'classes'} this week`,
    content,
    headerActions,
    onMount: (root) => {
      root.querySelector('#new-event')?.addEventListener('click', () => openEventEditor());
      root.querySelectorAll('.event-block').forEach((el) => el.addEventListener('click', () => {
        const e = getState().scheduleEvents.find((x) => x.id === el.dataset.id);
        if (e) openEventEditor(e);
      }));
      // Click empty slot to create event with prefilled day/time
      root.querySelectorAll('.day-column').forEach((col) => {
        col.addEventListener('click', (e) => {
          if (e.target.closest('.event-block')) return;
          const day = Number(col.dataset.day);
          const rect = col.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const minutes = Math.round((y / HOUR_HEIGHT) * 60) + START_HOUR * 60;
          const snapped = Math.max(START_HOUR * 60, Math.round(minutes / 15) * 15);
          const start = minutesToHHMM(snapped);
          const end = minutesToHHMM(snapped + 60);
          openEventEditor(null, { day, startTime: start, endTime: end });
        });
      });
    },
  };
}

function openEventEditor(existing = null, defaults = {}) {
  const isEdit = !!existing;
  const state = getState();
  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}" ${existing?.subjectId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');
  const dayOptions = DAY_NAMES.map((n, i) => `<option value="${i}" ${(existing?.day ?? defaults.day ?? 1) === i ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');

  openModal({
    title: isEdit ? 'Edit class' : 'Add class',
    content: `
      <form id="event-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Title</label>
          <input name="title" class="input" placeholder="e.g. Calc II Lecture" value="${escapeHtml(existing?.title || '')}" required autofocus />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1.5">Day</label>
            <select name="day" class="select">${dayOptions}</select>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1.5">Subject</label>
            <select name="subjectId" class="select">${subjectOptions}</select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1.5">Start time</label>
            <input type="time" name="startTime" class="input" value="${escapeHtml(existing?.startTime || defaults.startTime || '09:00')}" required />
          </div>
          <div>
            <label class="text-sm font-medium block mb-1.5">End time</label>
            <input type="time" name="endTime" class="input" value="${escapeHtml(existing?.endTime || defaults.endTime || '10:00')}" required />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium block mb-1.5">Location (optional)</label>
          <input name="location" class="input" placeholder="e.g. Room 204" value="${escapeHtml(existing?.location || '')}" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${isEdit ? `<button class="btn btn-danger" id="delete-event">${icon('trash', { size: 16 })}</button>` : ''}
      <button class="btn btn-primary" id="save">${isEdit ? 'Save' : 'Add'}</button>
    `,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#event-form');
      const submit = (e) => {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title') || '').trim();
        if (!title) { toast('Title is required', { type: 'error' }); return; }
        const day = Number(fd.get('day'));
        const subjectId = String(fd.get('subjectId') || '') || null;
        const startTime = String(fd.get('startTime') || '');
        const endTime = String(fd.get('endTime') || '');
        const location = String(fd.get('location') || '').trim();
        if (hhmmToMinutes(endTime) <= hhmmToMinutes(startTime)) {
          toast('End time must be after start time', { type: 'error' });
          return;
        }
        update((d) => {
          if (isEdit) {
            const i = d.scheduleEvents.findIndex((x) => x.id === existing.id);
            if (i >= 0) d.scheduleEvents[i] = { ...d.scheduleEvents[i], title, day, subjectId, startTime, endTime, location };
          } else {
            d.scheduleEvents.push({ id: uid('evt'), title, day, subjectId, startTime, endTime, location });
          }
        });
        toast(isEdit ? 'Class updated' : 'Class added', { type: 'success' });
        close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      form.addEventListener('submit', submit);
      wrap.querySelector('#save').addEventListener('click', submit);
      wrap.querySelector('#delete-event')?.addEventListener('click', async () => {
        const ok = await confirmDialog('Delete this class?', { danger: true, okText: 'Delete' });
        if (!ok) return;
        update((d) => { d.scheduleEvents = d.scheduleEvents.filter((x) => x.id !== existing.id); });
        toast('Class deleted');
        close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    },
  });
}
