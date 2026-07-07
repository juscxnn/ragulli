// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// SourceCard — a single source card on the canvas. Carries the
// filename, a type icon, byte size, chunk count, and the zone it
// currently belongs to (badge in the corner). Click → opens the
// source viewer via the workspace store's `openSourceViewer` action.
// HTML5-draggable so it can be moved between zones.

import { type DragEvent, type FC } from 'react';
import {
  ArticleIcon,
  ChapterIcon,
  ContractIcon,
  PdfIcon,
  TextIcon,
  UrlIcon,
} from '@/components/icons';
import type { SourceCard as SourceCardData } from '../store';

export type SourceCardProps = {
  source: SourceCardData;
  zoneName?: string;
  zoneColor?: string;
  onOpen: (sourceId: string) => void;
  onDragStart?: (e: DragEvent<HTMLButtonElement>, sourceId: string) => void;
  onDragEnd?: (e: DragEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
};

function pickIcon(mime: string, filename: string): typeof PdfIcon {
  const lower = filename.toLowerCase();
  const m = mime.toLowerCase();
  if (m === 'application/pdf' || lower.endsWith('.pdf')) return PdfIcon;
  if (m.includes('wordprocessingml') || lower.endsWith('.docx')) return ContractIcon;
  if (m === 'text/markdown' || lower.endsWith('.md') || lower.endsWith('.markdown'))
    return ChapterIcon;
  if (m === 'text/html' || lower.endsWith('.html') || lower.endsWith('.htm')) return ArticleIcon;
  if (m.startsWith('text/') || lower.endsWith('.txt')) return TextIcon;
  if (m.startsWith('url/') || lower.includes('url')) return UrlIcon;
  return TextIcon;
}

function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SourceCard: FC<SourceCardProps> = ({
  source,
  zoneName,
  zoneColor,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging = false,
}) => {
  const Icon = pickIcon(source.mimeType, source.filename);
  const handleDragStart = (e: DragEvent<HTMLButtonElement>): void => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/x-ragulli-source-id', source.id);
    onDragStart?.(e, source.id);
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(source.id)}
      data-source-id={source.id}
      className={`group w-full text-left rounded-md border bg-[var(--color-surface-2)] p-3 transition-all ${
        isDragging
          ? 'opacity-40 border-dashed border-[var(--color-accent)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-soft)]'
      }`}
      style={
        zoneColor
          ? { boxShadow: `inset 0 0 0 1px ${zoneColor}22` }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <span className="text-[var(--color-accent)] mt-0.5 shrink-0">
          <Icon size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-sm font-medium text-[var(--color-fg)] truncate"
              title={source.filename}
            >
              {source.filename}
            </span>
            {zoneName ? (
              <span
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0"
                style={{
                  color: zoneColor ?? 'var(--color-fg-muted)',
                  borderColor: `${zoneColor ?? 'var(--color-border)'}55`,
                  backgroundColor: `${zoneColor ?? 'var(--color-border)'}11`,
                }}
              >
                {zoneName}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)] tabular-nums">
            <span>{humanSize(source.byteSize)}</span>
            <span aria-hidden>·</span>
            <span>{source.chunkCount} chunks</span>
          </div>
        </div>
      </div>
    </button>
  );
};