// Lessons view: import a PDF (or paste text), then generate an on-device
// summary, ask questions, and auto-generate a quiz with difficulty levels.

import { getState, update } from '../state.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { navigate } from '../router.js';
import { escapeHtml, uid, toast, confirmDialog, formatDate } from '../utils.js';
import { extractPdfText, summarize, generateQuiz, answerQuestion } from '../lessons-engine.js';
import { putFile, getFile, deleteFile } from '../lib/idb.js';

const MAX_TEXT = 200000; // cap stored text to protect localStorage quota

const DIFF_META = {
  casual: { label: 'Casual', color: '#10b981', desc: 'Light & simple' },
  normal: { label: 'Normal', color: '#6366f1', desc: 'Balanced' },
  hard: { label: 'Hard', color: '#f43f5e', desc: 'In-depth & challenging' },
};

// ============================ List view =====================================

export function renderLessons() {
  const state = getState();
  const subjectById = Object.fromEntries(state.subjects.map((s) => [s.id, s]));
  const lessons = [...(state.lessons || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const headerActions = `<button id="add-lesson" class="btn btn-primary">${icon('plus', { size: 16 })} Add lesson</button>`;

  const cards = lessons.map((l) => {
    const s = l.subjectId ? subjectById[l.subjectId] : null;
    const dm = DIFF_META[l.difficulty] || DIFF_META.normal;
    return `
      <a href="#/lessons/${encodeURIComponent(l.id)}" class="card p-5 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all flex flex-col">
        <div class="flex items-start gap-2 mb-2">
          ${s ? `<span class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style="background: ${escapeHtml(s.color)}"></span>` : ''}
          <h3 class="font-semibold flex-1 truncate">${escapeHtml(l.title || 'Untitled lesson')}</h3>
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-3 flex-1">
          ${escapeHtml(l.sourceName || (l.sourceType === 'text' ? 'Pasted text' : 'PDF'))}
          ${l.pageCount ? ` · ${l.pageCount} pages` : ''}
        </div>
        <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span class="px-2 py-0.5 rounded-full font-semibold" style="background:${dm.color}1a;color:${dm.color}">${dm.label}</span>
          ${l.summary ? `<span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">Summary</span>` : ''}
          ${l.quiz ? `<span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">Quiz${l.quiz.lastScore != null ? ' · ' + l.quiz.lastScore + '%' : ''}</span>` : ''}
        </div>
      </a>`;
  }).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      ${lessons.length === 0 ? `
        <div class="empty">
          ${icon('book', { size: 48, class: 'mx-auto mb-3 opacity-40' })}
          <p class="font-medium mb-1">No lessons yet</p>
          <p class="text-sm mb-4">Import a PDF (or paste text) and Learnio will summarize it, answer your questions, and build a quiz — all on your device.</p>
          <button id="add-lesson-empty" class="btn btn-primary">${icon('plus', { size: 16 })} Add your first lesson</button>
        </div>
      ` : `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`}
    </div>`;

  return {
    title: 'Lessons',
    subtitle: lessons.length ? `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}` : 'PDF summaries, Q&A and quizzes',
    content,
    headerActions,
    onMount: (root) => {
      root.querySelector('#add-lesson')?.addEventListener('click', openImport);
      root.querySelector('#add-lesson-empty')?.addEventListener('click', openImport);
    },
  };
}

// ============================ Import flow ===================================

function openImport() {
  const state = getState();
  const subjectOptions = `<option value="">No subject</option>` + state.subjects.map((s) =>
    `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  const diffOptions = Object.entries(DIFF_META).map(([k, m]) =>
    `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${m.label} — ${m.desc}</option>`).join('');

  openModal({
    title: 'Add a lesson',
    size: 'lg',
    content: `
      <form id="lesson-form" class="space-y-4">
        <div>
          <label class="text-sm font-medium block mb-1.5">Title</label>
          <input name="title" class="input" placeholder="e.g. Chapter 7 - Photosynthesis" required autofocus />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1.5">Subject</label>
            <select name="subjectId" class="select">${subjectOptions}</select>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1.5">Difficulty</label>
            <select name="difficulty" class="select">${diffOptions}</select>
          </div>
        </div>

        <div class="flex gap-2 text-sm border-b border-slate-200 dark:border-slate-800">
          <button type="button" id="tab-pdf" class="px-3 py-2 border-b-2 border-brand-500 font-medium">Upload PDF</button>
          <button type="button" id="tab-text" class="px-3 py-2 border-b-2 border-transparent text-slate-500">Paste text</button>
        </div>

        <div id="pane-pdf">
          <label class="text-sm font-medium block mb-1.5">PDF file</label>
          <input type="file" name="pdf" accept="application/pdf,.pdf" class="input" />
          <p class="text-xs text-slate-400 mt-1.5">The text is extracted on your device. The original PDF is saved locally so you can reopen it. You need to be online the first time (to load the PDF reader).</p>
        </div>

        <div id="pane-text" class="hidden">
          <label class="text-sm font-medium block mb-1.5">Lesson text</label>
          <textarea name="text" class="textarea" rows="8" placeholder="Paste your notes or lesson text here..."></textarea>
        </div>

        <div id="import-status" class="text-sm text-slate-500 dark:text-slate-400 hidden"></div>
      </form>`,
    footer: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="import-save">Create lesson</button>`,
    onMount: (wrap, close) => {
      const form = wrap.querySelector('#lesson-form');
      const tabPdf = wrap.querySelector('#tab-pdf');
      const tabText = wrap.querySelector('#tab-text');
      const panePdf = wrap.querySelector('#pane-pdf');
      const paneText = wrap.querySelector('#pane-text');
      const status = wrap.querySelector('#import-status');
      const saveBtn = wrap.querySelector('#import-save');
      let mode = 'pdf';

      const setTab = (m) => {
        mode = m;
        const active = 'border-brand-500 font-medium';
        const inactive = 'border-transparent text-slate-500';
        tabPdf.className = `px-3 py-2 border-b-2 ${m === 'pdf' ? active : inactive}`;
        tabText.className = `px-3 py-2 border-b-2 ${m === 'text' ? active : inactive}`;
        panePdf.classList.toggle('hidden', m !== 'pdf');
        paneText.classList.toggle('hidden', m !== 'text');
      };
      tabPdf.addEventListener('click', () => setTab('pdf'));
      tabText.addEventListener('click', () => setTab('text'));

      const setStatus = (msg) => { status.classList.remove('hidden'); status.textContent = msg; };

      const submit = async (e) => {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title') || '').trim();
        if (!title) { toast('Title is required', { type: 'error' }); return; }
        const subjectId = String(fd.get('subjectId') || '') || null;
        const difficulty = String(fd.get('difficulty') || 'normal');

        let text = '';
        let sourceName = '';
        let sourceType = 'text';
        let pageCount = 0;
        let blob = null;

        saveBtn.disabled = true;

        try {
          if (mode === 'pdf') {
            const file = form.querySelector('input[name="pdf"]').files?.[0];
            if (!file) { toast('Choose a PDF file', { type: 'error' }); saveBtn.disabled = false; return; }
            sourceName = file.name;
            sourceType = 'pdf';
            blob = file;
            setStatus('Reading PDF…');
            const buf = await file.arrayBuffer();
            const res = await extractPdfText(buf, (p, total) => setStatus(`Extracting text… page ${p} of ${total}`));
            text = res.text;
            pageCount = res.pageCount;
            if (!text || text.trim().length < 20) {
              toast('No selectable text found. This PDF may be scanned images.', { type: 'error' });
              saveBtn.disabled = false;
              return;
            }
          } else {
            text = String(fd.get('text') || '').trim();
            sourceName = 'Pasted text';
            sourceType = 'text';
            if (text.length < 20) { toast('Paste a bit more text to work with', { type: 'error' }); saveBtn.disabled = false; return; }
          }
        } catch (err) {
          toast(err.message || 'Failed to read the file', { type: 'error' });
          saveBtn.disabled = false;
          return;
        }

        let truncated = false;
        if (text.length > MAX_TEXT) { text = text.slice(0, MAX_TEXT); truncated = true; }

        const id = uid('lesson');
        // Store the original PDF blob in IndexedDB (best-effort).
        let hasFile = false;
        if (blob) {
          try { await putFile(id, blob); hasFile = true; } catch (e) { /* non-fatal */ }
        }

        update((d) => {
          if (!d.lessons) d.lessons = [];
          d.lessons.push({
            id, subjectId, title, sourceName, sourceType, pageCount,
            charCount: text.length, text, difficulty,
            summary: null, quiz: null, hasFile,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          });
        });

        if (truncated) toast('Lesson saved (text was long, so it was trimmed a bit)', { type: 'success' });
        else toast('Lesson created', { type: 'success' });
        close();
        navigate(`/lessons/${id}`);
      };

      form.addEventListener('submit', submit);
      saveBtn.addEventListener('click', submit);
    },
  });
}

// ============================ Detail view ===================================

export function renderLessonDetail(id) {
  const state = getState();
  const lesson = (state.lessons || []).find((l) => l.id === id);
  if (!lesson) {
    return {
      title: 'Lesson not found',
      content: `<div class="px-4 md:px-8 py-12 max-w-3xl mx-auto text-center"><p class="text-slate-500 mb-4">That lesson doesn't exist.</p><a href="#/lessons" class="btn btn-primary">Back to lessons</a></div>`,
    };
  }
  const subject = lesson.subjectId ? state.subjects.find((s) => s.id === lesson.subjectId) : null;

  const headerActions = `
    ${lesson.hasFile ? `<button id="open-pdf" class="btn btn-secondary">${icon('book', { size: 16 })} Open PDF</button>` : ''}
    <button id="delete-lesson" class="btn btn-ghost text-rose-600 dark:text-rose-400">${icon('trash', { size: 16 })}</button>`;

  const diffButtons = Object.entries(DIFF_META).map(([k, m]) => `
    <button class="diff-btn btn btn-sm ${lesson.difficulty === k ? '' : 'btn-secondary'}" data-diff="${k}"
            style="${lesson.difficulty === k ? `background:${m.color};color:#fff;border-color:${m.color}` : ''}">${m.label}</button>
  `).join('');

  const content = `
    <div class="px-4 md:px-8 py-6 max-w-4xl mx-auto space-y-5">
      <a href="#/lessons" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">${icon('arrow_left', { size: 14 })} All lessons</a>

      <div class="card p-5">
        <div class="flex items-start gap-3">
          ${subject ? `<span class="w-3 h-3 rounded-full mt-1.5" style="background:${escapeHtml(subject.color)}"></span>` : ''}
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold">${escapeHtml(lesson.title)}</h2>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ${escapeHtml(lesson.sourceName || '')}${lesson.pageCount ? ` · ${lesson.pageCount} pages` : ''} · ${(lesson.charCount || 0).toLocaleString()} chars · added ${escapeHtml(formatDate(lesson.createdAt))}
            </div>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2 flex-wrap">
          <span class="text-xs text-slate-500 mr-1">Difficulty:</span>
          ${diffButtons}
          <span class="text-xs text-slate-400 ml-1" id="diff-hint"></span>
        </div>
      </div>

      <div class="flex gap-1 border-b border-slate-200 dark:border-slate-800 text-sm">
        <button class="lesson-tab px-4 py-2.5 border-b-2 border-brand-500 font-medium" data-tab="summary">Summary</button>
        <button class="lesson-tab px-4 py-2.5 border-b-2 border-transparent text-slate-500" data-tab="ask">Ask</button>
        <button class="lesson-tab px-4 py-2.5 border-b-2 border-transparent text-slate-500" data-tab="quiz">Quiz</button>
      </div>

      <div id="lesson-pane"></div>
    </div>`;

  return {
    title: lesson.title,
    subtitle: 'Lesson',
    content,
    headerActions,
    onMount: (root) => mountDetail(root, id),
  };
}

function getLesson(id) {
  return (getState().lessons || []).find((l) => l.id === id);
}

function patchLesson(id, patch) {
  update((d) => {
    const i = (d.lessons || []).findIndex((l) => l.id === id);
    if (i >= 0) d.lessons[i] = { ...d.lessons[i], ...patch, updatedAt: new Date().toISOString() };
  });
}

function mountDetail(root, id) {
  const pane = root.querySelector('#lesson-pane');
  let tab = 'summary';

  // Difficulty buttons
  const updateDiffButtons = () => {
    const lesson = getLesson(id);
    root.querySelectorAll('.diff-btn').forEach((b) => {
      const k = b.dataset.diff;
      const m = DIFF_META[k];
      if (lesson.difficulty === k) {
        b.classList.remove('btn-secondary');
        b.style = `background:${m.color};color:#fff;border-color:${m.color}`;
      } else {
        b.classList.add('btn-secondary');
        b.style = '';
      }
    });
  };
  root.querySelectorAll('.diff-btn').forEach((b) => b.addEventListener('click', () => {
    patchLesson(id, { difficulty: b.dataset.diff });
    updateDiffButtons();
    toast(`Difficulty set to ${DIFF_META[b.dataset.diff].label}`);
  }));

  // Tabs
  root.querySelectorAll('.lesson-tab').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    root.querySelectorAll('.lesson-tab').forEach((x) => {
      const active = x.dataset.tab === tab;
      x.className = `lesson-tab px-4 py-2.5 border-b-2 ${active ? 'border-brand-500 font-medium' : 'border-transparent text-slate-500'}`;
    });
    renderTab();
  }));

  // Header buttons
  root.querySelector('#open-pdf')?.addEventListener('click', async () => {
    try {
      const blob = await getFile(id);
      if (!blob) { toast('Original PDF not found on this device', { type: 'error' }); return; }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast('Could not open the PDF', { type: 'error' }); }
  });
  root.querySelector('#delete-lesson')?.addEventListener('click', async () => {
    const ok = await confirmDialog('Delete this lesson (and its saved PDF)?', { danger: true, okText: 'Delete' });
    if (!ok) return;
    try { await deleteFile(id); } catch (e) {}
    update((d) => { d.lessons = (d.lessons || []).filter((l) => l.id !== id); });
    toast('Lesson deleted');
    navigate('/lessons');
  });

  function renderTab() {
    if (tab === 'summary') renderSummary();
    else if (tab === 'ask') renderAsk();
    else renderQuiz();
  }

  // ---- Summary ----
  function renderSummary() {
    const lesson = getLesson(id);
    const s = lesson.summary;
    pane.innerHTML = `
      <div class="card p-5 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold flex items-center gap-2">${icon('notes', { size: 18 })} Summary</h3>
          <button id="gen-summary" class="btn btn-primary btn-sm">${icon('sparkles', { size: 14 })} ${s ? 'Regenerate' : 'Generate'}</button>
        </div>
        ${!s ? `
          <div class="empty text-sm">
            <p class="mb-1">No summary yet.</p>
            <p class="text-xs">Generate a ${DIFF_META[lesson.difficulty].label.toLowerCase()} summary from this lesson's text.</p>
          </div>
        ` : `
          <div class="text-[11px] text-slate-400 mb-2">${DIFF_META[s.difficulty]?.label || ''} summary</div>
          <ul class="space-y-2 mb-4">
            ${s.points.map((p) => `<li class="flex gap-2 text-sm"><span class="text-brand-500 mt-1">•</span><span>${escapeHtml(p)}</span></li>`).join('')}
          </ul>
          ${s.keyTerms && s.keyTerms.length ? `
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div class="text-xs font-medium text-slate-500 mb-2">Key terms</div>
              <div class="flex flex-wrap gap-1.5">
                ${s.keyTerms.map((t) => `<span class="px-2 py-1 rounded-md text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>` : ''}
        `}
      </div>`;
    pane.querySelector('#gen-summary').addEventListener('click', () => {
      const l = getLesson(id);
      const btn = pane.querySelector('#gen-summary');
      btn.disabled = true; btn.textContent = 'Working…';
      // Defer so the UI updates before the (sync) compute.
      setTimeout(() => {
        const result = summarize(l.text, l.difficulty, l.title);
        patchLesson(id, { summary: { ...result, difficulty: l.difficulty } });
        renderSummary();
        toast('Summary ready', { type: 'success' });
      }, 30);
    });
  }

  // ---- Ask ----
  let askHistory = [];
  function renderAsk() {
    pane.innerHTML = `
      <div class="card p-5 fade-in">
        <h3 class="font-semibold flex items-center gap-2 mb-3">${icon('search', { size: 18 })} Ask this lesson</h3>
        <p class="text-xs text-slate-400 mb-3">Answers are pulled from the most relevant passages in your lesson text.</p>
        <div class="flex gap-2">
          <input id="ask-input" class="input flex-1" placeholder="e.g. What is the role of chlorophyll?" />
          <button id="ask-btn" class="btn btn-primary">${icon('arrow_right', { size: 16 })}</button>
        </div>
        <div id="ask-results" class="mt-4 space-y-3"></div>
      </div>`;
    const input = pane.querySelector('#ask-input');
    const results = pane.querySelector('#ask-results');

    const renderHistory = () => {
      results.innerHTML = askHistory.map((h) => `
        <div class="fade-in">
          <div class="text-sm font-medium mb-1">${icon('search', { size: 13, class: 'inline -mt-0.5 text-slate-400' })} ${escapeHtml(h.q)}</div>
          <div class="text-sm rounded-lg p-3 ${h.found ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}">${escapeHtml(h.a)}</div>
        </div>`).join('');
    };

    const ask = () => {
      const q = input.value.trim();
      if (!q) return;
      const l = getLesson(id);
      const res = answerQuestion(l.text, q);
      askHistory.unshift({ q, a: res.answer, found: res.found });
      input.value = '';
      renderHistory();
    };
    pane.querySelector('#ask-btn').addEventListener('click', ask);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
    renderHistory();
  }

  // ---- Quiz ----
  function renderQuiz() {
    const lesson = getLesson(id);
    const quiz = lesson.quiz;
    pane.innerHTML = `
      <div class="card p-5 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold flex items-center gap-2">${icon('cards', { size: 18 })} Quiz</h3>
          <button id="gen-quiz" class="btn btn-primary btn-sm">${icon('sparkles', { size: 14 })} ${quiz ? 'New quiz' : 'Generate quiz'}</button>
        </div>
        ${!quiz ? `
          <div class="empty text-sm">
            <p class="mb-1">No quiz yet.</p>
            <p class="text-xs">Generate a ${DIFF_META[lesson.difficulty].label.toLowerCase()} quiz from this lesson.</p>
          </div>
        ` : `<div id="quiz-area"></div>`}
      </div>`;

    pane.querySelector('#gen-quiz').addEventListener('click', () => {
      const l = getLesson(id);
      const btn = pane.querySelector('#gen-quiz');
      btn.disabled = true; btn.textContent = 'Working…';
      setTimeout(() => {
        const questions = generateQuiz(l.text, l.difficulty, l.title);
        if (!questions.length) {
          toast('Not enough text to build a quiz from this lesson', { type: 'error' });
          btn.disabled = false; btn.textContent = 'Generate quiz';
          return;
        }
        patchLesson(id, { quiz: { difficulty: l.difficulty, questions, lastScore: null } });
        renderQuiz();
      }, 30);
    });

    if (quiz) renderQuizTaker(quiz);
  }

  function renderQuizTaker(quiz) {
    const area = pane.querySelector('#quiz-area');
    if (!area) return;
    const answers = new Array(quiz.questions.length).fill(null);
    let submitted = false;

    const draw = () => {
      area.innerHTML = `
        <div class="text-[11px] text-slate-400 mb-3">${DIFF_META[quiz.difficulty]?.label || ''} quiz · ${quiz.questions.length} questions</div>
        <ol class="space-y-5">
          ${quiz.questions.map((q, qi) => `
            <li class="text-sm">
              <div class="font-medium mb-2">${qi + 1}. ${escapeHtml(q.question)}</div>
              <div class="space-y-1.5">
                ${q.options.map((opt, oi) => {
                  let cls = 'border-slate-200 dark:border-slate-700';
                  let mark = '';
                  if (submitted) {
                    if (oi === q.answerIndex) { cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'; mark = icon('check', { size: 14, class: 'text-emerald-600' }); }
                    else if (answers[qi] === oi) { cls = 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'; mark = icon('x', { size: 14, class: 'text-rose-600' }); }
                  } else if (answers[qi] === oi) {
                    cls = 'border-brand-400 bg-brand-50 dark:bg-brand-900/20';
                  }
                  return `
                    <label class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${cls}" data-q="${qi}" data-o="${oi}">
                      <input type="radio" name="q${qi}" class="accent-brand-600" ${answers[qi] === oi ? 'checked' : ''} ${submitted ? 'disabled' : ''} />
                      <span class="flex-1">${escapeHtml(opt)}</span>
                      ${mark}
                    </label>`;
                }).join('')}
              </div>
              ${submitted ? `<div class="text-xs text-slate-500 mt-2 pl-1">${escapeHtml(q.explanation || '')}</div>` : ''}
            </li>`).join('')}
        </ol>
        <div class="mt-5 flex items-center gap-2">
          ${submitted
            ? `<button id="retake" class="btn btn-secondary">Retake</button><div id="score" class="font-semibold"></div>`
            : `<button id="submit-quiz" class="btn btn-primary">Submit answers</button>`}
        </div>`;

      if (!submitted) {
        area.querySelectorAll('label[data-q]').forEach((lab) => lab.addEventListener('click', () => {
          answers[Number(lab.dataset.q)] = Number(lab.dataset.o);
        }));
        area.querySelector('#submit-quiz').addEventListener('click', () => {
          if (answers.some((a) => a === null)) {
            const ok = answers.filter((a) => a !== null).length;
            if (!confirm(`You've answered ${ok} of ${quiz.questions.length}. Submit anyway?`)) return;
          }
          submitted = true;
          const correct = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
          const score = Math.round((correct / quiz.questions.length) * 100);
          patchLesson(id, { quiz: { ...quiz, lastScore: score } });
          draw();
          const scoreEl = area.querySelector('#score');
          if (scoreEl) {
            scoreEl.textContent = `You scored ${correct}/${quiz.questions.length} (${score}%)`;
            scoreEl.style.color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
          }
          toast(`Score: ${score}%`, { type: score >= 70 ? 'success' : 'default' });
        });
      } else {
        area.querySelector('#retake')?.addEventListener('click', () => {
          submitted = false;
          for (let i = 0; i < answers.length; i++) answers[i] = null;
          draw();
        });
      }
    };
    draw();
  }

  renderTab();
}
