// SVG icon registry. Returns SVG string for given name + class.

const icons = {
  home: '<path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><path d="M4 18a3 3 0 013-3h11"/>',
  notes: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M9 13h6M9 17h4"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h14v14"/>',
  tasks: '<path d="M3 7h18M3 12h18M3 17h12"/><path d="M19 15l2 2-3 3"/>',
  schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 16l4-4 3 3 5-7"/>',
  settings: '<path d="M12 2l2.39 2.39 3.32-.96 1 3.32 3.21 1.32-1.5 3.05 1.5 3.05-3.21 1.32-1 3.32-3.32-.96L12 22l-2.39-2.39-3.32.96-1-3.32-3.21-1.32 1.5-3.05-1.5-3.05 3.21-1.32 1-3.32 3.32.96L12 2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
  edit: '<path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  play: '<polygon points="5 3 19 12 5 21 5 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  reset: '<path d="M3 12a9 9 0 109-9"/><polyline points="3 4 3 10 9 10"/>',
  flame: '<path d="M12 2c0 5-5 6-5 11a5 5 0 0010 0c0-2-1-3-2-5 0 3-2 4-3 4s-2-1-2-3 2-3 2-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  arrow_left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  arrow_right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
  flag: '<path d="M4 21V4M4 4l13 0c1 0 1.5.5 1.5 1.5L17 9l1.5 3.5c0 1-.5 1.5-1.5 1.5H4"/>',
  star: '<polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 9"/>',
  graduation_cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"/><path d="M19 14l.9 2.3 2.3.9-2.3.9L19 20.4l-.9-2.3-2.3-.9 2.3-.9L19 14z"/>',
};

export function icon(name, opts = {}) {
  const path = icons[name] || icons.book;
  const size = opts.size || 20;
  const className = opts.class || '';
  const stroke = opts.stroke || 'currentColor';
  const fill = opts.fill || 'none';
  const sw = opts.strokeWidth || 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" class="${className}">${path}</svg>`;
}
