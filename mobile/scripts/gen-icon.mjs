// Generates PNG source images for @capacitor/assets from the project's SVG
// icons, using sharp (which can rasterize SVG). Run from the mobile/ directory.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '..');
const repoRoot = resolve(mobileRoot, '..');
const assetsDir = join(mobileRoot, 'assets');

const ICON_SVG = join(repoRoot, 'icons', 'icon.svg');
const MASKABLE_SVG = join(repoRoot, 'icons', 'maskable.svg');

const INDIGO = { r: 79, g: 70, b: 229, alpha: 1 }; // #4f46e5

async function main() {
  await mkdir(assetsDir, { recursive: true });

  // 1024x1024 app icon (rounded gradient tile).
  await sharp(ICON_SVG, { density: 384 })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(assetsDir, 'icon.png'));
  console.log('+ assets/icon.png (1024x1024)');

  // 2732x2732 splash: solid indigo with the maskable mark centered.
  const logo = await sharp(MASKABLE_SVG, { density: 384 })
    .resize(1100, 1100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: INDIGO },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(assetsDir, 'splash.png'));
  console.log('+ assets/splash.png (2732x2732)');

  // Dark splash (same look works on dark backgrounds).
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(assetsDir, 'splash-dark.png'));
  console.log('+ assets/splash-dark.png (2732x2732)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
