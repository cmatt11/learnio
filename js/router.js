// Tiny hash-based router

const routes = [];
let currentMatch = null;
const listeners = new Set();

export function route(pattern, handler) {
  // pattern like '/subjects/:id'
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) +
      '$'
  );
  routes.push({ pattern, regex, keys, handler });
}

export function navigate(path) {
  if (location.hash !== `#${path}`) {
    location.hash = path;
  } else {
    handle();
  }
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function parsePath() {
  let path = location.hash.slice(1) || '/';
  const queryIdx = path.indexOf('?');
  let query = {};
  if (queryIdx >= 0) {
    const qs = path.slice(queryIdx + 1);
    path = path.slice(0, queryIdx);
    qs.split('&').filter(Boolean).forEach((pair) => {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return { path, query };
}

function handle() {
  const { path, query } = parsePath();
  for (const r of routes) {
    const m = r.regex.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      currentMatch = { path, pattern: r.pattern, params, query };
      r.handler({ params, query, path });
      listeners.forEach((fn) => fn(currentMatch));
      return;
    }
  }
  // No match - fallback to root
  if (path !== '/') navigate('/');
}

export function start() {
  window.addEventListener('hashchange', handle);
  if (!location.hash) location.hash = '/';
  else handle();
}

export const getMatch = () => currentMatch;
