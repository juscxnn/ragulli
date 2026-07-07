// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// FirstDrop — the Scene 1 hero. A real drop target, four big
// icon-buttons (PDF, URL, TEXT, AUDIO-disabled) plus four
// sample-file buttons. AUDIO is V1.5 per spec §1.5, so we render it
// disabled with a tooltip. Every non-disabled path routes through
// the shared ingest controller, so progress and failures surface in
// the workspace store — never only in the console. The URL path
// opens a proper dialog (no window.prompt) that validates the URL
// and shows fetch errors inline.

import { useCallback, useRef, useState, type ChangeEvent, type FC } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Dropzone } from '@/components/ui/Dropzone';
import { Tooltip } from '@/components/ui/Tooltip';
import type { TooltipProps } from '@/components/ui/Tooltip';
import { parseUrl, UrlFetchError } from '@/features/ingest/parsers/url';
import { ingestFiles, reportIngestError } from '@/features/workspace/ingest';
import { useWorkspaceStore } from '@/features/workspace/store';

export type FirstDropProps = {
  workspaceId: string;
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

const ACCEPT_ALL = '.pdf,.docx,.md,.markdown,.txt,.html,.htm';

export const FirstDrop: FC<FirstDropProps> = ({ workspaceId, onAfterIngest }) => {
  const filePdfRef = useRef<HTMLInputElement>(null);
  const fileTextRef = useRef<HTMLInputElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const sourceIds = await ingestFiles(files, workspaceId);
      for (const id of sourceIds) onAfterIngest?.(id);
    },
    [workspaceId, onAfterIngest],
  );

  const onPickPdf = (): void => filePdfRef.current?.click();
  const onPickText = (): void => fileTextRef.current?.click();

  const onPickSample = useCallback(
    async (id: SampleId) => {
      const sample = SAMPLES.find((s) => s.id === id);
      if (!sample) return;
      const filename = basenameFromHref(sample.href);
      try {
        const res = await fetch(sample.href);
        if (!res.ok) throw new Error(`The sample could not be fetched (HTTP ${res.status}).`);
        const blob = await res.blob();
        const mime = blob.type || guessMimeFromHref(sample.href);
        const file = new File([blob], filename, { type: mime });
        await handleFiles([file]);
      } catch (err) {
        reportIngestError(filename, err);
      }
    },
    [handleFiles],
  );

  return (
    <section className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
      <header className="text-center flex flex-col gap-3">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-fg)] tracking-tight">
          Your files. Your AI. Your browser.
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Drop a document. Get answers that cite the line. Nothing leaves this tab.
        </p>
      </header>

      {ingestProgress?.phase === 'error' ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          <span className="text-[var(--color-fg)]">{ingestProgress.filename}</span> could not
          be ingested{ingestProgress.error ? `: ${ingestProgress.error}` : '.'}
        </div>
      ) : null}

      <Dropzone onFiles={(files) => void handleFiles(files)} accept={ACCEPT_ALL}>
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-sm text-[var(--color-fg)]">Drop a file to ingest</span>
          <span className="text-xs text-[var(--color-fg-muted)]">
            PDF, DOCX, Markdown, text, HTML
          </span>
        </div>
      </Dropzone>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigButton label="PDF" icon={<PdfIcon size={28} />} onClick={onPickPdf} />
        <BigButton label="URL" icon={<UrlIcon size={28} />} onClick={() => setUrlDialogOpen(true)} />
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
          if (f) void handleFiles([f]);
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
          if (f) void handleFiles([f]);
          e.target.value = '';
        }}
      />

      <UrlIngestDialog
        open={urlDialogOpen}
        onClose={() => setUrlDialogOpen(false)}
        onIngest={handleFiles}
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

type UrlIngestDialogProps = {
  open: boolean;
  onClose: () => void;
  onIngest: (files: File[]) => Promise<void>;
};

/** The URL ingest dialog. Validates the URL before fetching and
 *  keeps fetch errors inside the dialog so the user can correct the
 *  address and retry without losing context. */
const UrlIngestDialog: FC<UrlIngestDialogProps> = ({ open, onClose, onIngest }) => {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = (): void => {
    setUrl('');
    setError(null);
    setFetching(false);
  };

  const close = (): void => {
    if (fetching) return;
    reset();
    onClose();
  };

  const submit = async (): Promise<void> => {
    const trimmed = url.trim();
    const invalid = validateUrl(trimmed);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setFetching(true);
    try {
      const parsed = await parseUrl(trimmed);
      const blob = new Blob([parsed.text], { type: 'text/plain' });
      const file = new File([blob], `${hostname(trimmed)}.txt`, { type: 'text/plain' });
      reset();
      onClose();
      await onIngest([file]);
    } catch (err) {
      setFetching(false);
      if (err instanceof UrlFetchError) {
        setError(err.message);
      } else {
        setError(`Could not fetch the URL. ${errMessage(err)}`);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Ingest a URL"
      description="We fetch the page in this tab, extract the article text, and index it locally."
      width="md"
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label
          htmlFor="first-drop-url"
          className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]"
        >
          URL to ingest
        </label>
        <input
          id="first-drop-url"
          type="url"
          value={url}
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          disabled={fetching}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)] disabled:opacity-50"
        />
        {error ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={fetching || url.trim().length === 0}
          >
            {fetching ? 'Fetching' : 'Fetch and ingest'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={close} disabled={fetching}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
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

/** Returns a plain-English problem statement, or null when valid. */
function validateUrl(raw: string): string | null {
  if (raw.length === 0) return 'Paste a URL first.';
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return 'That does not look like a valid URL. Include the full address, like https://example.com/article.';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Only http and https URLs can be ingested.';
  }
  return null;
}

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
