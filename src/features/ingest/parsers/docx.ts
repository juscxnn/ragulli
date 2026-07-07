// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// DOCX parser. We use mammoth's `extractRawText` which strips the
// entire Word XML structure and yields plain text only. Page numbers
// are not preserved (DOCX has no fixed page model — pagination is a
// runtime concern of the renderer), so pageMap is empty and the
// citation builder falls back to whole-chunk anchors.

import type { ParseResult } from './types';

type MammothResult = { value: string; messages: Array<{ type: string; message: string }> };

interface MammothModule {
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}

let mammothModulePromise: Promise<MammothModule> | null = null;

async function loadMammoth(): Promise<MammothModule> {
  if (!mammothModulePromise) {
    mammothModulePromise = import('mammoth').then((m) => m as unknown as MammothModule);
  }
  return mammothModulePromise;
}

export async function parseDocx(file: File | Blob): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const mammoth = await loadMammoth();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return {
    text: result.value.trim(),
    pageMap: [],
    meta: { warnings: result.messages.length, byteSize: file.size },
  };
}

/** Test-only: replace the cached mammoth module. */
export function _setMammothForTests(mod: MammothModule | null): void {
  mammothModulePromise = mod ? Promise.resolve(mod) : null;
}
