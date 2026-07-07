// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// FirstDrop — the Scene 1 hero. Four big icon-buttons (PDF, URL, TEXT,
// AUDIO) plus four sample buttons. Disabled until Subagent B wires the
// ingest pipeline.

import type { FC } from 'react';
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

export type FirstDropProps = {
  disabled?: boolean;
  onPickFile?: (kind: 'pdf' | 'text') => void;
  onPickUrl?: () => void;
  onPickAudio?: () => void;
  onPickSample?: (sample: SampleId) => void;
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
  disabled = true,
  onPickFile,
  onPickUrl,
  onPickAudio,
  onPickSample,
}) => {
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
        <BigButton
          label="PDF"
          icon={<PdfIcon size={28} />}
          onClick={() => onPickFile?.('pdf')}
          disabled={disabled}
        />
        <BigButton
          label="URL"
          icon={<UrlIcon size={28} />}
          onClick={() => onPickUrl?.()}
          disabled={disabled}
        />
        <BigButton
          label="TEXT"
          icon={<TextIcon size={28} />}
          onClick={() => onPickFile?.('text')}
          disabled={disabled}
        />
        <BigButton
          label="AUDIO"
          icon={<AudioIcon size={28} />}
          onClick={() => onPickAudio?.()}
          disabled={disabled}
        />
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
              onClick={() => onPickSample?.(s.id)}
              disabled={disabled}
              className="flex items-center gap-3 p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <span className="text-[var(--color-accent)]">
                <s.Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-sm text-[var(--color-fg)]">{s.label}</span>
                <span className="block text-xs text-[var(--color-fg-muted)]">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
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
    className="flex flex-col items-center gap-2 p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <span className="text-[var(--color-accent)]">{icon}</span>
    <span className="text-xs uppercase tracking-wide">{label}</span>
  </button>
);
