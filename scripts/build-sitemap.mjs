// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// build-sitemap.mjs — Generate dist/sitemap.xml at build time.
// Lists every route the landing site serves: /, the six /t/{id}
// pages, the three /compare/{id} pages, and /privacy.
//
// Pure Node, no deps. Run as part of `pnpm build` after `vite build`
// has produced dist/. We compute lastmod from the source mtime of
// the corresponding HTML file when present; otherwise we use a
// fixed BUILD_DATE so the sitemap is stable across rebuilds with
// no source change.

import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

const SITE = 'https://ragulli.com';

const ROUTES = [
  { path: '/', html: 'index.html', priority: '1.0' },
  { path: '/privacy', html: 'privacy.html', priority: '0.5' },
  { path: '/t/research-paper-reader', html: 't/research-paper-reader.html', priority: '0.8' },
  { path: '/t/contract-reviewer', html: 't/contract-reviewer.html', priority: '0.8' },
  { path: '/t/customer-interview-corpus', html: 't/customer-interview-corpus.html', priority: '0.8' },
  { path: '/t/book-companion', html: 't/book-companion.html', priority: '0.8' },
  { path: '/t/newsletter-digester', html: 't/newsletter-digester.html', priority: '0.8' },
  { path: '/t/job-application-matcher', html: 't/job-application-matcher.html', priority: '0.8' },
  { path: '/compare/notebooklm', html: 'compare/notebooklm.html', priority: '0.7' },
  { path: '/compare/humata', html: 'compare/humata.html', priority: '0.7' },
  { path: '/compare/chatpdf', html: 'compare/chatpdf.html', priority: '0.7' },
];

async function lastmod(htmlPath) {
  try {
    const stat = await fs.stat(resolve(DIST, htmlPath));
    return stat.mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

async function main() {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const r of ROUTES) {
    const lm = await lastmod(r.html);
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(SITE + r.path)}</loc>`);
    lines.push(`    <lastmod>${lm}</lastmod>`);
    lines.push(`    <priority>${r.priority}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  lines.push('');
  await fs.mkdir(DIST, { recursive: true });
  await fs.writeFile(resolve(DIST, 'sitemap.xml'), lines.join('\n'), 'utf8');
  console.log(`build-sitemap: wrote ${ROUTES.length} URL(s) to dist/sitemap.xml`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});