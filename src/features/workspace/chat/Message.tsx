// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
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
  return (
    <article className="flex flex-col gap-2">
      <header className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
        <span>{role}</span>
      </header>
      <div
        className={`whitespace-pre-wrap leading-relaxed ${
          isAssistant
            ? 'font-serif text-[15px] text-[var(--color-fg)]'
            : 'text-sm text-[var(--color-fg)]'
        }`}
      >
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
      {isAssistant && sourcesUsed && sourcesUsed.length > 0 ? (
        <footer className="mt-2 pt-2 border-t border-[var(--color-border)]/60 flex flex-wrap gap-2 text-xs">
          <span className="text-[var(--color-fg-muted)] mr-1">Sources used:</span>
          {sourcesUsed.map((s, i) => (
            <CitationSpan
              key={i}
              chunkId={`footer-${i}`}
              sourceId={s.sourceId}
              charStart={s.charStart}
              onOpen={onOpenCitation}
            >
              {s.label}
            </CitationSpan>
          ))}
        </footer>
      ) : null}
    </article>
  );
};