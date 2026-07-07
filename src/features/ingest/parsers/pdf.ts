// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// PDF parser. We use pdfjs-dist's text layer only — no canvas, no
// rendering. For each page, we request the text content and join
// the items into a single string, recording the (charStart, charEnd)
// range in the concatenated output so the citation builder can map
// any chunk back to a page number. If the PDF has no text layer
// (scanned image), every page returns empty text and we surface a
// warning in `meta` so the trust panel can show the limitation.

import { getDocument, GlobalWorkerOptions, type TextItem } from 'pdfjs-dist';
import type { ParseResult } from './types';

const PDFJS_WORKER_URL = 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerSrcSet = false;
async function ensureWorker(): Promise<void> {
  if (workerSrcSet) return;
  try {
    const url = (await import(/* @vite-ignore */ PDFJS_WORKER_URL)).default as string;
    GlobalWorkerOptions.workerSrc = url;
  } catch {
    // No worker available (e.g. test environment without Vite's
    // bundler). pdfjs-dist falls back to running on the main thread
    // when workerSrc is empty. That is slower but correct.
    GlobalWorkerOptions.workerSrc = '';
  }
  workerSrcSet = true;
}

function joinTextItems(items: ReadonlyArray<unknown>): string {
  const out: string[] = [];
  for (const raw of items) {
    const item = raw as TextItem;
    if (typeof item.str === 'string' && item.str.length > 0) {
      out.push(item.str);
      if (!item.hasEOL) out.push(' ');
    }
  }
  return out.join('').replace(/[ \t]+/g, ' ').trim();
}

export async function parsePdf(file: File | Blob): Promise<ParseResult> {
  await ensureWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await getDocument({ data, isEvalSupported: false }).promise;
  const pageMap: ParseResult['pageMap'] = [];
  const pageTexts: string[] = [];
  let emptyPages = 0;
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const text = joinTextItems(content.items as ReadonlyArray<unknown>);
      if (text.length === 0) emptyPages += 1;
      pageTexts.push(text);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  const text = pageTexts.join('\n\n').trim();
  let cursor = 0;
  for (let i = 0; i < pageTexts.length; i += 1) {
    const seg = pageTexts[i] ?? '';
    const start = cursor;
    const end = cursor + seg.length;
    if (seg.length > 0) {
      pageMap.push({ pageNum: i + 1, charStart: start, charEnd: end });
    }
    // +2 for the '\n\n' separator we just joined.
    cursor = end + 2;
  }
  const meta: Record<string, unknown> = {
    pageCount: pageMap.length + emptyPages,
    emptyPages,
  };
  if (emptyPages > 0) {
    meta.warning = `${emptyPages} page(s) had no text layer; OCR is out of scope for V1.`;
  }
  return { text, pageMap, meta };
}
