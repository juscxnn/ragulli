// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// build-og-image.mjs — Convert public/logo-full.svg to public/og-image.png
// (1200×630, the standard OG size) and export the logo-mark at 192, 512
// and 512-maskable PNGs. Pure Node + @resvg/resvg-js. No network access.

import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = resolve(__dirname, '..', 'public');

async function readSvg(rel) {
  return fs.readFile(resolve(PUBLIC, rel), 'utf8');
}

async function writePng(rel, png) {
  const path = resolve(PUBLIC, rel);
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, png);
  console.log(`  wrote ${rel} (${png.length} bytes)`);
}

async function exists(rel) {
  try {
    await fs.access(resolve(PUBLIC, rel));
    return true;
  } catch {
    return false;
  }
}

async function render(svg, width, height) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: '#0B2027',
    font: { loadSystemFonts: true, defaultFontFamily: 'Lora' },
  });
  return r.render().asPng();
}

async function main() {
  console.log('build-og-image: rendering PNGs from SVG sources');
  const mark = await readSvg('logo-mark.svg');
  const full = await readSvg('logo-full.svg');

  // PWA icons — skip if they already exist (idempotent builds).
  if (!(await exists('logo-mark.png'))) {
    await writePng('logo-mark.png', await render(mark, 192, 192));
  }
  if (!(await exists('logo-mark-512.png'))) {
    await writePng('logo-mark-512.png', await render(mark, 512, 512));
  }
  if (!(await exists('logo-mark-maskable.png'))) {
    await writePng('logo-mark-maskable.png', await render(mark, 512, 512));
  }
  // OG image — render the dedicated 1200×630 composition.
  if (!(await exists('og-image.png'))) {
    const ogSvg = await readSvg('og-image.svg');
    await writePng('og-image.png', await render(ogSvg, 1200, 630));
  }

  // favicon.ico is a 32×32 PNG. Browsers accept PNG-in-ICO just fine.
  if (!(await exists('favicon-32.png'))) {
    await writePng('favicon-32.png', await render(mark, 32, 32));
  }
  if (!(await exists('favicon.ico'))) {
    await writePng('favicon.ico', await render(mark, 32, 32));
  }

  console.log('build-og-image: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
