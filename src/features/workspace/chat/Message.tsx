// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Message — a single chat message. Renders text and citation segments
// from a flat `RenderSegment[]` partition. The long-form prose of an
// assistant answer uses the serif (Lora) stack per spec §8.2.

import { Fragment, type FC } from 'react';
import type { RenderSegment } from '@/features/llm';
import { CitationSpan } from './CitationSpan';

export type MessageProps = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  segments?: RenderSegment[];
  onOpenCitation: (sourceId: string, charStart: number) => void;
  /** Footer row: a list of source labels with chunk ids for the
   *  "Sources used" line under each assistant answer. */
  sourcesUsed?: Array<{ label: string; sourceId: string; charStart: number }>;
};

export const Message: FC<MessageProps> = ({
  role,
  content,
  segments,
  onOpenCitation,
  sourcesUsed,
}) => {
  const isAssistant = role === 'assistant';

  // User turns read as a compact right-aligned bubble; assistant turns
  // are full-width serif prose so long answers are comfortable to read.
  if (!isAssistant) {
    return (
      <article className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-surface-2)] px-3.5 py-2 text-sm text-[var(--color-fg)] whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
        RAGülli
      </div>
      <div className="whitespace-pre-wrap leading-[1.7] font-serif text-[15px] text-[var(--color-fg)]">
        {segments && segments.length > 0 ? (
          segments.map((seg, i) => {
            if (seg.kind === 'text') {
              return <Fragment key={i}>{seg.text}</Fragment>;
            }
            const c = seg.citation;
            if (!c) return <Fragment key={i}>{seg.text}</Fragment>;
            return (
              <CitationSpan
                key={i}
                chunkId={c.chunkId}
                sourceId={c.sourceId}
                charStart={c.charStart}
                onOpen={onOpenCitation}
              >
                {seg.text}
              </CitationSpan>
            );
          })
        ) : (
          content
        )}
      </div>
      {sourcesUsed && sourcesUsed.length > 0 ? (
        <footer className="mt-1 pt-2.5 border-t border-[var(--color-border)]/60 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)] mr-0.5">
            Sources
          </span>
          {sourcesUsed.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onOpenCitation(s.sourceId, s.charStart)}
              data-chunk-id={`footer-${i}`}
              data-source-id={s.sourceId}
              className="inline-flex items-center gap-1 max-w-[14rem] rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 transition-colors"
            >
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </footer>
      ) : null}
    </article>
  );
};