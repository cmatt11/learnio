// Copies the static web app from the repo root into mobile/www so Capacitor
// can bundle it into the Android APK. Run from the mobile/ directory.

import { cp, rm, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '..');
const repoRoot = resolve(mobileRoot, '..');
const www = join(mobileRoot, 'www');

// Files/folders from the repo root to include in the app bundle.
const ENTRIES = [
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'css',
  'js',
  'icons',
];

const exists = async (p) => {
  try { await access(p); return true; } catch { return false; }
};

async function main() {
  await rm(www, { recursive: true, force: true });
  await mkdir(www, { recursive: true });

  for (const entry of ENTRIES) {
    const src = join(repoRoot, entry);
    if (!(await exists(src))) {
      console.warn(`! skipping missing ${entry}`);
      continue;
    }
    await cp(src, join(www, entry), { recursive: true });
    console.log(`+ ${entry}`);
  }

  // Note: the service worker is intentionally NOT copied. Inside the native
  // WebView the assets are already local, so a service worker is redundant
  // (and main.js skips registration when Capacitor is detected).
  console.log(`\nBuilt www/ at ${www}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
