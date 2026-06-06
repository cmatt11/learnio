// Lessons engine: PDF text extraction + on-device summarization, quiz
// generation, and extractive question answering. No server / no API key:
// everything runs in the browser using simple, transparent algorithms.

// --- PDF.js (lazy-loaded from CDN) ------------------------------------------

const PDFJS_VERSION = '4.0.379';
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsPromise = null;

async function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    let lib;
    try {
      lib = await import(/* @vite-ignore */ PDFJS_URL);
    } catch (e) {
      throw new Error('Could not load the PDF reader. Please connect to the internet the first time you import a PDF.');
    }
    try {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    } catch (e) {
      /* ignore - will fall back to main-thread parsing */
    }
    return lib;
  })();
  return pdfjsPromise;
}

// Extract plain text from a PDF ArrayBuffer. Returns { text, pageCount }.
export async function extractPdfText(arrayBuffer, onProgress) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageCount = doc.numPages;
  const parts = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY = null;
    let line = [];
    const lines = [];
    for (const item of content.items) {
      const str = item.str;
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.join(''));
        line = [];
      }
      line.push(str);
      lastY = y;
    }
    if (line.length) lines.push(line.join(''));
    parts.push(lines.join('\n'));
    if (onProgress) onProgress(i, pageCount);
  }
  const text = parts.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text, pageCount };
}

// --- Text utilities ---------------------------------------------------------

const STOPWORDS = new Set(
  ('a an the and or but if then else when while for to of in on at by with from as is are was were be been being this that these those it its it\'s he she they them his her their we you your our i me my mr ms dr not no nor so than too very can could would should will shall may might must do does did done have has had having about above below up down out over under again further once here there all any both each few more most other some such only own same s t just don now into through during before after between against above'
    .split(/\s+/))
);

function splitSentences(text) {
  if (!text) return [];
  // Normalize, protect common abbreviations a little, then split.
  const clean = text.replace(/\s+/g, ' ').trim();
  const raw = clean.match(/[^.!?]+[.!?]+(?:["')\]]+)?|\S[^.!?]*$/g) || [];
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function words(text) {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || []);
}

function contentWords(text) {
  return words(text).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function buildFrequencies(text) {
  const freq = new Map();
  for (const w of contentWords(text)) freq.set(w, (freq.get(w) || 0) + 1);
  return freq;
}

// Candidate "key terms": capitalized multi-letter words (likely names/terms)
// plus the most frequent content words.
function extractKeyTerms(text, freq, limit = 10) {
  const capCounts = new Map();
  const capMatches = text.match(/\b[A-Z][A-Za-z][A-Za-z-]{2,}\b/g) || [];
  for (const m of capMatches) {
    const key = m.toLowerCase();
    if (STOPWORDS.has(key)) continue;
    if (!capCounts.has(key)) capCounts.set(key, { display: m, count: 0 });
    capCounts.get(key).count++;
  }
  const capTerms = [...capCounts.values()]
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((t) => t.display);

  const freqTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const seen = new Set();
  const result = [];
  for (const t of [...capTerms, ...freqTerms]) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(t);
    if (result.length >= limit) break;
  }
  return result;
}

function scoreSentences(sentences, freq, titleWords) {
  let maxFreq = 1;
  for (const v of freq.values()) maxFreq = Math.max(maxFreq, v);
  return sentences.map((sentence, index) => {
    const cw = contentWords(sentence);
    if (cw.length === 0) return { sentence, index, score: 0, length: 0 };
    let score = 0;
    for (const w of cw) score += (freq.get(w) || 0) / maxFreq;
    // Normalize by sqrt(length) so very long sentences aren't unfairly favored.
    score = score / Math.sqrt(cw.length);
    // Position boost: earlier sentences tend to introduce key ideas.
    if (index < 3) score *= 1.15;
    // Title overlap boost.
    if (titleWords && titleWords.length) {
      const lower = sentence.toLowerCase();
      for (const tw of titleWords) if (tw.length >= 3 && lower.includes(tw)) score *= 1.08;
    }
    return { sentence, index, score, length: cw.length };
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFFICULTY = {
  casual: { summary: 4, quiz: 5, options: 3 },
  normal: { summary: 7, quiz: 8, options: 4 },
  hard: { summary: 11, quiz: 12, options: 4 },
};

// --- Summary ----------------------------------------------------------------

export function summarize(text, difficulty = 'normal', title = '') {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const sentences = splitSentences(text).filter((s) => contentWords(s).length >= 4);
  const freq = buildFrequencies(text);
  const titleWords = contentWords(title || '');
  const keyTerms = extractKeyTerms(text, freq, difficulty === 'hard' ? 12 : 8);

  if (sentences.length === 0) {
    return { points: ['Not enough readable text was found to summarize.'], keyTerms: [] };
  }

  let scored = scoreSentences(sentences, freq, titleWords);
  // Casual prefers shorter, punchier sentences.
  if (difficulty === 'casual') {
    scored = scored.map((s) => ({ ...s, score: s.score / (1 + s.length / 30) }));
  }

  const take = Math.max(2, Math.min(cfg.summary, Math.ceil(sentences.length * 0.5)));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, take);
  // Restore original reading order.
  top.sort((a, b) => a.index - b.index);

  const points = top.map((t) => t.sentence.replace(/\s+/g, ' ').trim());
  return { points, keyTerms };
}

// --- Quiz generation --------------------------------------------------------

function pickSalientWord(sentence, freq, { preferLessCommon = false } = {}) {
  const cw = [...new Set(contentWords(sentence))].filter((w) => w.length >= 4);
  if (cw.length === 0) return null;
  // Prefer capitalized terms in the original sentence.
  const caps = sentence.match(/\b[A-Z][A-Za-z][A-Za-z-]{2,}\b/g) || [];
  const capSet = new Set(caps.map((c) => c.toLowerCase()));
  const ranked = cw
    .map((w) => {
      let weight = freq.get(w) || 1;
      if (capSet.has(w)) weight += 5; // names/terms are good blanks
      return { w, weight };
    })
    .sort((a, b) => (preferLessCommon ? a.weight - b.weight : b.weight - a.weight));
  return ranked[0].w;
}

function originalCasing(sentence, lowerWord) {
  const re = new RegExp(`\\b(${lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
  const m = sentence.match(re);
  return m ? m[1] : lowerWord;
}

export function generateQuiz(text, difficulty = 'normal', title = '') {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const freq = buildFrequencies(text);
  const titleWords = contentWords(title || '');
  const termPool = extractKeyTerms(text, freq, 30);

  const candidates = splitSentences(text)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => {
      const n = words(s).length;
      return n >= 8 && n <= 40;
    });

  if (candidates.length < 2) {
    return [];
  }

  const scored = scoreSentences(candidates, freq, titleWords).sort((a, b) => b.score - a.score);
  // For hard, skip the very top obvious sentences to make it less predictable.
  const ordered = difficulty === 'hard' ? scored.slice(1) : scored;

  const questions = [];
  const usedSentences = new Set();
  const usedAnswers = new Set();
  const wantTF = difficulty === 'hard' ? 3 : difficulty === 'normal' ? 2 : 0;
  let tfMade = 0;

  for (const item of ordered) {
    if (questions.length >= cfg.quiz) break;
    const sentence = item.sentence;
    if (usedSentences.has(sentence)) continue;

    const answerLower = pickSalientWord(sentence, freq, { preferLessCommon: difficulty === 'hard' });
    if (!answerLower) continue;
    if (usedAnswers.has(answerLower)) continue;
    const answer = originalCasing(sentence, answerLower);

    // Build distractors from the term pool.
    let pool = termPool.filter((t) => {
      const tl = t.toLowerCase();
      return tl !== answerLower && !sentence.toLowerCase().includes(tl);
    });
    if (difficulty === 'hard') {
      // Closest terms by frequency similarity = harder distractors.
      const af = freq.get(answerLower) || 1;
      pool.sort((a, b) => Math.abs((freq.get(a.toLowerCase()) || 1) - af) - Math.abs((freq.get(b.toLowerCase()) || 1) - af));
    } else {
      pool = shuffle(pool);
    }
    const distractors = [];
    const seen = new Set([answerLower]);
    for (const t of pool) {
      const tl = t.toLowerCase();
      if (seen.has(tl)) continue;
      seen.add(tl);
      distractors.push(t);
      if (distractors.length >= cfg.options - 1) break;
    }
    if (distractors.length < cfg.options - 1) continue; // not enough material

    // Make a True/False question occasionally (after we have a few MCQs).
    if (tfMade < wantTF && questions.length >= 2 && questions.length % 3 === 0) {
      const makeFalse = Math.random() < 0.5;
      let statement = sentence;
      let isTrue = true;
      if (makeFalse) {
        statement = sentence.replace(new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), distractors[0]);
        isTrue = false;
      }
      questions.push({
        id: `q_${questions.length}`,
        type: 'tf',
        question: statement,
        options: ['True', 'False'],
        answerIndex: isTrue ? 0 : 1,
        explanation: `Original text: "${sentence}"`,
      });
      usedSentences.add(sentence);
      tfMade++;
      continue;
    }

    const blanked = sentence.replace(new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), '_____');
    const options = shuffle([answer, ...distractors]);
    questions.push({
      id: `q_${questions.length}`,
      type: 'mcq',
      question: `Fill in the blank: ${blanked}`,
      options,
      answerIndex: options.indexOf(answer),
      explanation: `Answer: ${answer}`,
    });
    usedSentences.add(sentence);
    usedAnswers.add(answerLower);
  }

  return questions;
}

// --- Question answering (extractive retrieval) ------------------------------

export function answerQuestion(text, question) {
  const sentences = splitSentences(text).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 0);
  if (sentences.length === 0) {
    return { found: false, answer: 'There is no readable text in this lesson to search.', matches: [] };
  }
  const freq = buildFrequencies(text);
  const totalDocs = sentences.length;
  // Document frequency per term (in how many sentences it appears).
  const df = new Map();
  const sentTokens = sentences.map((s) => new Set(contentWords(s)));
  for (const set of sentTokens) for (const w of set) df.set(w, (df.get(w) || 0) + 1);

  const qTokens = [...new Set(contentWords(question))];
  if (qTokens.length === 0) {
    return { found: false, answer: 'Try asking with a few more keywords.', matches: [] };
  }

  const scores = sentences.map((sentence, i) => {
    let score = 0;
    for (const q of qTokens) {
      if (sentTokens[i].has(q)) {
        const idf = Math.log(1 + totalDocs / (1 + (df.get(q) || 0)));
        score += idf;
      }
    }
    // Small boost for sentences that contain more of the query terms.
    return { sentence, i, score };
  });

  const top = scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (top.length === 0) {
    return { found: false, answer: "I couldn't find anything about that in this lesson. Try different keywords.", matches: [] };
  }
  // Keep original order for readability.
  top.sort((a, b) => a.i - b.i);
  const matches = top.map((t) => t.sentence);
  return { found: true, answer: matches.join(' '), matches };
}

export const DIFFICULTIES = ['casual', 'normal', 'hard'];
