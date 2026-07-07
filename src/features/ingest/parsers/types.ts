// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Shared types for the document parsers. Every parser returns the same
// shape so the pipeline can dispatch on MIME type without conditional
// result handling. `pageMap` records the character offsets of each
// page inside the concatenated `text`; for formats without a fixed
// page model (DOCX, Markdown, plain text, URL-fetched HTML) the array
// is empty and the citation builder falls back to whole-chunk anchors.

export type PageMapEntry = {
  pageNum: number;
  charStart: number;
  charEnd: number;
};

export type ParseResult = {
  text: string;
  pageMap: PageMapEntry[];
  /** Free-form metadata: page count, warnings, etc. */
  meta: Record<string, unknown>;
};
