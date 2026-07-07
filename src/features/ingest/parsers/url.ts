// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// URL parser. We fetch the URL, parse the response body as HTML, then
// run Mozilla Readability to extract the article body. Readability
// removes nav, ads, sidebars, etc. and returns a clean textContent.
// The result has no page model (most pages are continuous scroll), so
// pageMap is empty. CORS failures and non-2xx responses throw a clear
// error that the trust panel can show to the user.

import { Readability, isProbablyReaderable } from '@mozilla/readability';
import type { ParseResult } from './types';

export class UrlFetchError extends Error {
  readonly status: number | undefined;
  readonly cause: unknown;
  constructor(message: string, opts: { status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'UrlFetchError';
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

export async function parseUrl(url: string): Promise<ParseResult> {
  let response: Response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    throw new UrlFetchError(
      `Could not fetch ${url}. The site may block browser requests (CORS), be offline, or the URL is malformed.`,
      { cause: err },
    );
  }
  if (!response.ok) {
    throw new UrlFetchError(`Fetch ${url} returned HTTP ${response.status}.`, {
      status: response.status,
    });
  }
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let article: ReturnType<Readability['parse']> | null = null;
  if (isProbablyReaderable(doc)) {
    const reader = new Readability(doc);
    article = reader.parse();
  } else {
    // Fall back to the whole document body when the heuristic says
    // it's not an article (e.g. short marketing pages, docs indexes).
    article = {
      title: doc.title || null,
      textContent: doc.body?.textContent ?? '',
      content: null,
      length: null,
      excerpt: null,
      byline: null,
      dir: null,
      siteName: null,
      lang: null,
      publishedTime: null,
    } as ReturnType<Readability['parse']>;
  }
  const text = (article?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    text,
    pageMap: [],
    meta: {
      url,
      title: article?.title ?? null,
      byline: article?.byline ?? null,
      siteName: article?.siteName ?? null,
    },
  };
}
