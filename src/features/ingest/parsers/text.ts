// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Plain-text parser. Reads the file as UTF-8 and returns it verbatim.
// No page model exists, so pageMap is empty.

import type { ParseResult } from './types';

export async function parseText(file: File | Blob): Promise<ParseResult> {
  const text = await file.text();
  return {
    text,
    pageMap: [],
    meta: { byteSize: file.size },
  };
}
