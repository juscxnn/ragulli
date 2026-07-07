// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Minimal Markdown-to-plain-text renderer. The spec forbids adding
// new dependencies without justification, and `marked` is not in
// package.json. Markdown is a small, regular format; a few hundred
// lines of regex cover everything we need: strip code fences and
// inline code, strip heading hashes, strip link syntax (keep the
// label), strip image syntax, strip emphasis markers, strip
// blockquote, list, and horizontal-rule markers, and collapse
// repeated blank lines. The result is a clean prose string suitable
// for the chunker.

import type { ParseResult } from './types';

const FENCE_RE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1\s*$/gm;
const INLINE_CODE_RE = /`([^`]+)`/g;
const HEADING_RE = /(^|\n)#{1,6}\s+/g;
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const EMPHASIS_RE = /(\*\*|__|\*|_)(.*?)\1/g;
const HR_RE = /(^|\n)([-*_])\s*\2\s*\2[ \t]*(\n|$)/g;
const BLOCKQUOTE_RE = /(^|\n)>\s?/g;
const LIST_RE = /(^|\n)(?:\s*)([-*+]|\d+\.)\s+/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const BLANK_LINES_RE = /\n{3,}/g;

function stripMarkdown(input: string): string {
  return input
    .replace(FENCE_RE, '')
    .replace(INLINE_CODE_RE, '$1')
    .replace(HEADING_RE, '$1')
    .replace(IMAGE_RE, '$1')
    .replace(LINK_RE, '$1')
    .replace(EMPHASIS_RE, '$2')
    .replace(HR_RE, '$1')
    .replace(BLOCKQUOTE_RE, '$1')
    .replace(LIST_RE, '$1')
    .replace(HTML_COMMENT_RE, '')
    .replace(HTML_TAG_RE, '');
}

export function markdownToPlain(input: string): string {
  return stripMarkdown(input)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(BLANK_LINES_RE, '\n\n')
    .trim();
}

export async function parseMarkdown(file: File | Blob): Promise<ParseResult> {
  const raw = await file.text();
  return {
    text: markdownToPlain(raw),
    pageMap: [],
    meta: { byteSize: file.size },
  };
}
