// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// IngestDefaults settings tab. Sliders for chunk size (200..2000
// tokens) and overlap (0..200 tokens, must be strictly less than
// chunk size), a workspace template picker, and a "Reset to
// defaults" button. The selected values persist in localStorage
// under `ragulli:ingest:v1` and are picked up by the ingest
// pipeline on next ingest.

import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { TEMPLATES, type Template } from '@/features/templates/templates';

interface IngestPrefs {
  chunkSize: number;
  chunkOverlap: number;
  templateId: string | null;
}

const DEFAULTS: IngestPrefs = {
  chunkSize: 800,
  chunkOverlap: 100,
  templateId: null,
};

const STORAGE_KEY = 'ragulli:ingest:v1';

function loadPrefs(): IngestPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<IngestPrefs>;
    return {
      chunkSize: clampNumber(parsed.chunkSize, 200, 2000, DEFAULTS.chunkSize),
      chunkOverlap: clampNumber(parsed.chunkOverlap, 0, 200, DEFAULTS.chunkOverlap),
      templateId: typeof parsed.templateId === 'string' ? parsed.templateId : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function clampNumber(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.trunc(v)));
}

function savePrefs(prefs: IngestPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage may be unavailable */
  }
}

export const IngestDefaults: FC = () => {
  const [prefs, setPrefs] = useState<IngestPrefs>(loadPrefs);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const onChunkSize = useCallback((v: number) => {
    setPrefs((p) => {
      // overlap can't exceed chunk size - 1
      const overlap = Math.min(p.chunkOverlap, v - 1);
      return { ...p, chunkSize: v, chunkOverlap: overlap };
    });
  }, []);
  const onOverlap = useCallback(
    (v: number) => {
      setPrefs((p) => ({ ...p, chunkOverlap: Math.min(v, p.chunkSize - 1) }));
    },
    [],
  );
  const onTemplate = useCallback((id: string | null) => {
    setPrefs((p) => ({ ...p, templateId: id }));
  }, []);
  const onReset = useCallback(() => {
    setPrefs({ ...DEFAULTS });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-4">
        <h3 className="text-sm font-medium text-[var(--color-fg)]">Chunking</h3>
        <Slider
          label="Chunk size (tokens)"
          value={prefs.chunkSize}
          min={200}
          max={2000}
          step={50}
          onChange={onChunkSize}
        />
        <Slider
          label="Chunk overlap (tokens, must be less than chunk size)"
          value={prefs.chunkOverlap}
          min={0}
          max={200}
          step={10}
          onChange={onOverlap}
        />
        <p className="text-xs text-[var(--color-fg-muted)]">
          Smaller chunks improve retrieval precision on Q&A; larger chunks preserve
          longer reasoning chains. Overlap prevents losing context at chunk boundaries.
        </p>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-[var(--color-fg)]">Workspace template</h3>
        <TemplateList active={prefs.templateId} onPick={onTemplate} />
      </section>

      <div>
        <Button variant="ghost" onClick={onReset}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
};

interface TemplateListProps {
  active: string | null;
  onPick: (id: string | null) => void;
}

const TemplateList: FC<TemplateListProps> = ({ active, onPick }) => {
  const templates = useMemo(() => TEMPLATES, []);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left ${
          active === null
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/40'
        }`}
      >
        <span className="text-sm text-[var(--color-fg)]">None</span>
        <span className="text-xs text-[var(--color-fg-muted)]">No template; use chunk/overlap sliders as-is.</span>
      </button>
      {templates.map((t: Template) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onPick(t.id)}
          className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left ${
            active === t.id
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/40'
          }`}
        >
          <span className="text-sm text-[var(--color-fg)]">{t.name}</span>
          <span className="text-xs text-[var(--color-fg-muted)]">{t.description}</span>
          <span className="text-[11px] text-[var(--color-fg-muted)] mt-1">
            chunk {t.ingestDefaults.chunkSize} · overlap {t.ingestDefaults.chunkOverlap}
          </span>
        </button>
      ))}
    </div>
  );
};
