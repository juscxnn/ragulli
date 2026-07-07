// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the document parsers. The PDF, DOCX, and URL parsers
// depend on real libraries; we mock them here so the suite has no
// network, no native worker, and runs in milliseconds. The text
// parser and the markdown renderer are exercised end-to-end.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseText } from '@/features/ingest/parsers/text';
import { markdownToPlain, parseMarkdown } from '@/features/ingest/parsers/markdown';
import { _setMammothForTests, parseDocx } from '@/features/ingest/parsers/docx';
import { parseUrl, UrlFetchError } from '@/features/ingest/parsers/url';

// --- mock pdfjs-dist -------------------------------------------------------
const mockGetDocument = vi.fn();
vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  GlobalWorkerOptions: { workerSrc: '' },
}));

async function parsePdf(file: File | Blob) {
  // Re-import after the mock is installed so the module picks it up.
  const mod = await import('@/features/ingest/parsers/pdf');
  return mod.parsePdf(file);
}

function makeFakePdf(opts: {
  pageCount: number;
  perPageText?: string[];
  perPageHasText?: boolean[];
}) {
  const perPageText = opts.perPageText ?? Array.from({ length: opts.pageCount }, () => 'page text');
  const perPageHasText =
    opts.perPageHasText ?? Array.from({ length: opts.pageCount }, () => true);
  return {
    numPages: opts.pageCount,
    async getPage(n: number) {
      return {
        async getTextContent() {
          const items = perPageHasText[n - 1]
            ? [{ str: perPageText[n - 1] ?? '', hasEOL: true }]
            : [];
          return { items, styles: {}, lang: null };
        },
        cleanup() {
          /* noop */
        },
      };
    },
    async destroy() {
      /* noop */
    },
  };
}

// --- mock mammoth ---------------------------------------------------------
const mockMammothExtract = vi.fn();
vi.mock('mammoth', () => ({
  default: {
    extractRawText: (...args: unknown[]) => mockMammothExtract(...args),
  },
  extractRawText: (...args: unknown[]) => mockMammothExtract(...args),
}));

function makeFile(name: string, body: string, mime = 'text/plain'): File {
  return new File([body], name, { type: mime });
}

describe('parseText', () => {
  it('reads UTF-8 text end-to-end', async () => {
    const f = makeFile('a.txt', 'hello world\nsecond line');
    const out = await parseText(f);
    expect(out.text).toBe('hello world\nsecond line');
    expect(out.pageMap).toEqual([]);
  });
});

describe('parseMarkdown / markdownToPlain', () => {
  it('strips heading hashes, code fences, link syntax, and emphasis', () => {
    const input = [
      '# Top heading',
      '',
      'Some **bold** and _italic_ and `inline code` text.',
      '',
      '## Subsection',
      '',
      'A [link to docs](https://example.com) here.',
      '',
      '```js',
      'const x = 1;',
      '```',
      '',
      '> A quoted thought.',
      '',
      '- one',
      '- two',
      '',
      '![alt text](https://example.com/img.png)',
      '',
    ].join('\n');
    const out = markdownToPlain(input);
    expect(out).not.toMatch(/^#/m);
    expect(out).not.toContain('```');
    expect(out).not.toContain('**');
    expect(out).not.toContain('_inline code_');
    expect(out).toContain('link to docs');
    expect(out).not.toContain('https://example.com)');
    expect(out).toContain('A quoted thought.');
    expect(out).not.toMatch(/^[-*]\s/m);
    expect(out).toContain('alt text');
    expect(out).not.toContain('![');
  });

  it('collapses runs of blank lines into at most two', () => {
    const input = 'a\n\n\n\n\nb';
    const out = markdownToPlain(input);
    expect(out).toBe('a\n\nb');
  });

  it('returns a ParseResult with empty pageMap', async () => {
    const f = makeFile('a.md', '# Title\n\nBody.');
    const out = await parseMarkdown(f);
    expect(out.text).toBe('Title\n\nBody.');
    expect(out.pageMap).toEqual([]);
    expect(out.meta.byteSize).toBeGreaterThan(0);
  });
});

describe('parsePdf', () => {
  beforeEach(() => {
    mockGetDocument.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('parses a multi-page PDF and records per-page char ranges', async () => {
    const fake = makeFakePdf({ pageCount: 2, perPageText: ['alpha', 'beta'] });
    mockGetDocument.mockReturnValue({ promise: Promise.resolve(fake) });
    const f = makeFile('paper.pdf', '%PDF-fake');
    const out = await parsePdf(f);
    expect(out.text).toContain('alpha');
    expect(out.text).toContain('beta');
    expect(out.pageMap).toHaveLength(2);
    expect(out.pageMap[0]?.pageNum).toBe(1);
    expect(out.pageMap[1]?.pageNum).toBe(2);
    // char ranges are contiguous: page 1 ends where page 2 begins.
    const p1 = out.pageMap[0]!;
    const p2 = out.pageMap[1]!;
    expect(out.text.slice(p1.charStart, p1.charEnd)).toBe('alpha');
    expect(out.text.slice(p2.charStart, p2.charEnd)).toBe('beta');
  });

  it('records empty-page count in meta when a page has no text layer', async () => {
    const fake = makeFakePdf({ pageCount: 2, perPageHasText: [true, false] });
    mockGetDocument.mockReturnValue({ promise: Promise.resolve(fake) });
    const out = await parsePdf(makeFile('scan.pdf', '%PDF-fake'));
    expect(out.pageMap).toHaveLength(1);
    expect(out.meta.emptyPages).toBe(1);
    expect(out.meta.warning).toBeDefined();
  });
});

describe('parseDocx', () => {
  beforeEach(() => {
    _setMammothForTests({
      extractRawText: mockMammothExtract,
    });
    mockMammothExtract.mockReset();
  });
  afterEach(() => {
    _setMammothForTests(null);
  });

  it('returns mammoth raw text and empty pageMap', async () => {
    mockMammothExtract.mockResolvedValue({ value: 'extracted text body', messages: [] });
    const out = await parseDocx(makeFile('a.docx', 'fake'));
    expect(out.text).toBe('extracted text body');
    expect(out.pageMap).toEqual([]);
    expect(mockMammothExtract).toHaveBeenCalledTimes(1);
  });

  it('trims trailing whitespace from mammoth output', async () => {
    mockMammothExtract.mockResolvedValue({ value: '  hello  \n', messages: [] });
    const out = await parseDocx(makeFile('a.docx', 'fake'));
    expect(out.text).toBe('hello');
  });
});

describe('parseUrl', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.startsWith('https://example.com/article')) {
          return new Response(
            `<!doctype html><html><body><article>
              <h1>An article</h1>
              <p>First paragraph of the article body.</p>
              <p>Second paragraph that contains the meat of the argument.</p>
            </article><nav>skip me</nav></body></html>`,
            { status: 200, headers: { 'content-type': 'text/html' } },
          );
        }
        if (url.startsWith('https://example.com/404')) {
          return new Response('not found', { status: 404 });
        }
        return new Response('', { status: 500 });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = realFetch;
  });

  it('extracts article body and returns plain text', async () => {
    const out = await parseUrl('https://example.com/article');
    // The article body must be present. Readability's nav-stripping
    // heuristics differ in jsdom vs a real browser, so we only assert
    // on the article content here, not on the negative case.
    expect(out.text).toContain('First paragraph of the article body');
    expect(out.text).toContain('Second paragraph');
    expect(out.pageMap).toEqual([]);
    expect(out.meta.url).toBe('https://example.com/article');
  });

  it('throws UrlFetchError on non-2xx responses', async () => {
    await expect(parseUrl('https://example.com/404')).rejects.toBeInstanceOf(UrlFetchError);
    await expect(parseUrl('https://example.com/404')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws UrlFetchError on network/CORS failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(parseUrl('https://example.com/blocked')).rejects.toBeInstanceOf(UrlFetchError);
  });
});
