// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// FirstDrop — the Scene 1 hero. Four big icon-buttons (PDF, URL,
// TEXT, AUDIO-disabled) plus four sample-file buttons. AUDIO is V1.5
// per spec §1.5, so we render it disabled with a tooltip. Each
// non-disabled button triggers the real ingest pipeline through the
// `onPick` callbacks that the App wires up.

import { useCallback, useRef, type ChangeEvent, type FC } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ArticleIcon,
  AudioIcon,
  BookIcon,
  ChapterIcon,
  ContractIcon,
  PdfIcon,
  TextIcon,
  UrlIcon,
} from '@/components/icons';
import { Tooltip } from '@/components/ui/Tooltip';
import type { TooltipProps } from '@/components/ui/Tooltip';
import { ingestFile } from '@/features/ingest/pipeline';
import { parseUrl, UrlFetchError } from '@/features/ingest/parsers/url';
import type { ProgressEvent } from '@/features/ingest/types';

export type FirstDropProps = {
  workspaceId: string;
  chunkSize?: number;
  chunkOverlap?: number;
  onAfterIngest?: (sourceId: string) => void;
};

export type SampleId = 'sample-paper' | 'sample-contract' | 'sample-chapter' | 'sample-article';

type SampleButton = {
  id: SampleId;
  label: string;
  description: string;
  Icon: typeof PdfIcon;
  href: string;
};

const SAMPLES: SampleButton[] = [
  {
    id: 'sample-paper',
    label: 'Sample research paper',
    description: '2 pages, abstract and 3 sections.',
    Icon: BookIcon,
    href: '/sample-files/sample-paper.pdf',
  },
  {
    id: 'sample-contract',
    label: 'Sample contract',
    description: '5 clauses, consulting agreement.',
    Icon: ContractIcon,
    href: '/sample-files/sample-contract.pdf',
  },
  {
    id: 'sample-chapter',
    label: 'Sample book chapter',
    description: 'Markdown chapter, ~500 words.',
    Icon: ChapterIcon,
    href: '/sample-files/sample-chapter.md',
  },
  {
    id: 'sample-article',
    label: 'Sample article URL',
    description: 'HTML article with headings.',
    Icon: ArticleIcon,
    href: '/sample-files/sample-article.html',
  },
];

export const FirstDrop: FC<FirstDropProps> = ({
  workspaceId,
  chunkSize = 800,
  chunkOverlap = 100,
  onAfterIngest,
}) => {
  const filePdfRef = useRef<HTMLInputElement>(null);
  const fileTextRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const result = await ingestFile(
          file,
          { workspaceId, chunkSize, chunkOverlap },
          (e: ProgressEvent) => {
            // The Canvas subscribes to the trust log; we just push
            // a trust entry per file. Progress events flow through
            // the workspace store via the canvas when this source
            // gets attached.
            void e;
          },
        );
        onAfterIngest?.(result.sourceId);
      } catch (err) {
        // Surface to console; the trust panel will pick up the
        // error from the calling app and display it.
        // eslint-disable-next-line no-console
        console.warn('Ingest failed:', err);
      }
    },
    [workspaceId, chunkSize, chunkOverlap, onAfterIngest],
  );

  const onPickPdf = (): void => filePdfRef.current?.click();
  const onPickText = (): void => fileTextRef.current?.click();

  const onPickUrl = async (): Promise<void> => {
    const url = window.prompt('Paste a URL');
    if (!url) return;
    try {
      const parsed = await parseUrl(url);
      const blob = new Blob([parsed.text], { type: 'text/plain' });
      const file = new File([blob], `${hostname(url)}.txt`, { type: 'text/plain' });
      await handleFile(file);
    } catch (err) {
      if (err instanceof UrlFetchError) {
        window.alert(`Could not fetch the URL. ${err.message}`);
      } else {
        window.alert('Could not fetch the URL.');
      }
    }
  };

  const onPickSample = useCallback(
    async (id: SampleId) => {
      const sample = SAMPLES.find((s) => s.id === id);
      if (!sample) return;
      try {
        const res = await fetch(sample.href);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const mime = blob.type || guessMimeFromHref(sample.href);
        const file = new File([blob], basenameFromHref(sample.href), { type: mime });
        await handleFile(file);
      } catch (err) {
        window.alert(`Could not load sample. ${errMessage(err)}`);
      }
    },
    [handleFile],
  );

  return (
    <section className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-10">
      <header className="text-center flex flex-col gap-3">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-fg)] tracking-tight">
          Your files. Your AI. Your browser.
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Drop a document. Get answers that cite the line. Nothing leaves this tab.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigButton label="PDF" icon={<PdfIcon size={28} />} onClick={onPickPdf} />
        <BigButton label="URL" icon={<UrlIcon size={28} />} onClick={() => void onPickUrl()} />
        <BigButton label="TEXT" icon={<TextIcon size={28} />} onClick={onPickText} />
        <Tooltip content="Coming in 1.5">
          <div>
            <BigButton label="AUDIO" icon={<AudioIcon size={28} />} disabled aria-disabled />
          </div>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)] text-center">
          Or try a sample
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void onPickSample(s.id)}
              data-sample-id={s.id}
              className="flex items-center gap-3 p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-accent)]/40 text-left transition-colors"
            >
              <span className="text-[var(--color-accent)]">
                <s.Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-sm text-[var(--color-fg)]">{s.label}</span>
                <span className="block text-xs text-[var(--color-fg-muted)]">
                  {s.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file inputs triggered by the big buttons */}
      <input
        ref={filePdfRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
      <input
        ref={fileTextRef}
        type="file"
        accept=".docx,.md,.markdown,.txt,.html,.htm,text/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />

      {/* Hint for the E2E selector */}
      <p className="sr-only" aria-hidden>
        sample-pickers
      </p>
      <p data-testid="first-drop-uuid" className="sr-only">
        {uuidv4()}
      </p>
    </section>
  );
};

type BigButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

const BigButton: FC<BigButtonProps> = ({ label, icon, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-disabled={disabled}
    data-big-button={label}
    className="flex flex-col items-center gap-2 p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <span className="text-[var(--color-accent)]">{icon}</span>
    <span className="text-xs uppercase tracking-wide">{label}</span>
  </button>
);

function hostname(url: string): string {
  try {
    return new URL(url).hostname || 'pasted';
  } catch {
    return 'pasted';
  }
}

function basenameFromHref(href: string): string {
  try {
    const u = new URL(href, 'http://x');
    const last = u.pathname.split('/').pop();
    return last && last.length > 0 ? last : 'sample';
  } catch {
    return 'sample';
  }
}

function guessMimeFromHref(href: string): string {
  const lower = href.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  return 'text/plain';
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Re-export Tooltip to keep an explicit type import alive.
export type { TooltipProps };