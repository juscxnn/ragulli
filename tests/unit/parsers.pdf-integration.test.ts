// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Real-pdf integration test. We polyfill `DOMMatrix` in tests/setup.ts
// so pdfjs-dist v5 can load under jsdom, and we run pdfjs in
// main-thread mode (workerSrc = ''). This is the same code path the
// parser takes in environments where Vite's worker bundling is not
// available.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { parsePdf } from '@/features/ingest/parsers/pdf';

function makeFile(name: string, bytes: Uint8Array, mime = 'application/pdf'): File {
  return new File([bytes], name, { type: mime });
}

describe('parsePdf (real pdfjs, sample-paper.pdf)', () => {
  beforeAll(() => {
    GlobalWorkerOptions.workerSrc = '';
  });

  it('extracts text and a per-page char map from the committed sample PDF', async () => {
    const path = resolve(process.cwd(), 'public/sample-files/sample-paper.pdf');
    const bytes = await readFile(path);
    const file = makeFile('sample-paper.pdf', new Uint8Array(bytes));
    const out = await parsePdf(file);

    const text = out.text.toLowerCase();
    expect(text.length).toBeGreaterThan(100);
    expect(text).toContain('abstract');
    expect(text).toContain('questions');
    expect(out.pageMap.length).toBeGreaterThanOrEqual(2);
    for (const entry of out.pageMap) {
      expect(entry.charEnd).toBeGreaterThan(entry.charStart);
      expect(entry.pageNum).toBeGreaterThan(0);
    }
  });
});

