// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Zone — a dashed-border container on the canvas that groups sources.
// Spec Scene 5: soft dashed border, zone color glow, header with the
// zone name (double-click to rename), a small delete button, a weight
// slider, and a drop target for source cards.

import { useState, type DragEvent, type FC, type KeyboardEvent, type ReactNode } from 'react';
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { WeightSlider } from './WeightSlider';

export type ZoneProps = {
  id: string;
  name: string;
  weight: number;
  color: string;
  children?: ReactNode;
  onWeightChange: (id: string, weight: number) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDropSource: (zoneId: string, sourceId: string) => void;
  sourceCount: number;
};

export const Zone: FC<ZoneProps> = ({
  id,
  name,
  weight,
  color,
  children,
  onWeightChange,
  onRename,
  onDelete,
  onDropSource,
  sourceCount,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [over, setOver] = useState(false);

  const commitRename = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== name) onRename(id, trimmed);
    else setDraft(name);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(name);
      setEditing(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!e.dataTransfer.types.includes('text/x-ragulli-source-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!over) setOver(true);
  };

  const onDragLeave = (): void => setOver(false);

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setOver(false);
    const sourceId = e.dataTransfer.getData('text/x-ragulli-source-id');
    if (sourceId) onDropSource(id, sourceId);
  };

  return (
    <section
      data-zone-id={id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
        over ? 'bg-[var(--color-accent)]/5' : ''
      }`}
      style={{
        borderColor: `${color}66`,
        backgroundColor: over ? `${color}0d` : undefined,
      }}
    >
      <header className="flex items-center gap-3 mb-3 flex-wrap">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
        />
        {editing ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={onKeyDown}
            aria-label="Rename zone"
            className="flex-1 min-w-[120px] bg-transparent border-b border-[var(--color-accent)] text-sm font-medium text-[var(--color-fg)] focus:outline-none"
          />
        ) : (
          <h3
            className="text-sm font-medium text-[var(--color-fg)] cursor-text"
            onDoubleClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            title="Double-click to rename"
          >
            {name}
            <span className="ml-2 text-[11px] text-[var(--color-fg-muted)] tabular-nums">
              {sourceCount}
            </span>
          </h3>
        )}
        <div className="flex-1 min-w-[180px]">
          <WeightSlider
            id={`zone-weight-${id}`}
            value={weight}
            onChange={(w) => onWeightChange(id, w)}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete zone ${name}`}
          onClick={() => onDelete(id)}
        >
          <CloseIcon size={14} />
        </Button>
      </header>
      <div className="flex flex-col gap-2 min-h-[40px]">{children}</div>
    </section>
  );
};