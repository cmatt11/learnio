// Tiny markdown renderer - covers common syntax
// (Intentionally simple - safe enough for trusted user content stored in localStorage.)

import { escapeHtml } from './utils.js';

export function renderMarkdown(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushPara = (buf) => {
    if (!buf.length) return;
    out.push(`<p>${inline(buf.join(' '))}</p>`);
    buf.length = 0;
  };

  let para = [];

  while (i < lines.length) {
    let line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      flushPara(para);
      const lang = line.slice(3).trim();
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing
      out.push(
        `<pre><code${lang ? ` class="lang-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`
      );
      continue;
    }

    // headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(para);
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      flushPara(para);
      out.push('<hr/>');
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushPara(para);
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      flushPara(para);
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      out.push(`<ul>${items.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara(para);
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(`<ol>${items.map((li) => `<li>${inline(li)}</li>`).join('')}</ol>`);
      continue;
    }

    // empty line breaks paragraph
    if (line.trim() === '') {
      flushPara(para);
      i++;
      continue;
    }

    para.push(line);
    i++;
  }
  flushPara(para);
  return out.join('\n');
}

function inline(text) {
  // Escape first
  let s = escapeHtml(text);

  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);

  // Bold **x** or __x__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *x* or _x_
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);

  // Auto-link bare urls (very simple)
  s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (_, sp, u) => `${sp}<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

  return s;
}
