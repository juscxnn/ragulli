// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Dropzone — the inner drop zone primitive used inside the canvas.
// Wraps the generic `ui/Dropzone` for files, but also exposes a
// small URL / paste affordance because Spec Scene 1 lists URL and
// TEXT as first-class drop targets. The URL fetch is performed by
// the caller (the canvas / chat panel route through `ingestFile`
// after wrapping the URL body in a synthetic File).

import { useRef, useState, type ChangeEvent, type FC, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dropzone as BaseDropzone } from '@/components/ui/Dropzone';

export type DropzoneProps = {
  /** Called with the picked files (drop OR file picker). */
  onFiles: (files: File[]) => void;
  /** Optional URL ingest path. Receives the URL string. */
  onUrl?: (url: string) => void;
  /** Optional paste-text path. Receives the pasted text. */
  onPaste?: (text: string) => void;
  /** File accept attribute. Defaults to all supported types. */
  accept?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** Children rendered inside the drop area. */
  children?: ReactNode;
  /** Hide the URL/paste affordances (e.g. inside the canvas). */
  compact?: boolean;
};

const DEFAULT_ACCEPT = '.pdf,.docx,.md,.markdown,.txt,.html,.htm';

export const Dropzone: FC<DropzoneProps> = ({
  onFiles,
  onUrl,
  onPaste,
  accept = DEFAULT_ACCEPT,
  disabled,
  children,
  compact = false,
}) => {
  const [mode, setMode] = useState<'drop' | 'url' | 'paste'>('drop');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (mode === 'url' && onUrl) {
    const submit = (): void => {
      const trimmed = url.trim();
      if (trimmed.length === 0) return;
      onUrl(trimmed);
      setUrl('');
    };
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <label
          htmlFor="dz-url"
          className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]"
        >
          URL to ingest
        </label>
        <input
          id="dz-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="https://example.com/article"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)]"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={submit} disabled={url.trim().length === 0}>
            Fetch and ingest
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMode('drop');
              setUrl('');
            }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'paste' && onPaste) {
    const submit = (): void => {
      if (text.trim().length === 0) return;
      onPaste(text);
      setText('');
    };
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <label
          htmlFor="dz-paste"
          className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]"
        >
          Paste text
        </label>
        <textarea
          id="dz-paste"
          ref={inputRef}
          value={text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="Paste any text. We'll chunk and embed it locally."
          rows={6}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)] resize-y"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={submit} disabled={text.trim().length === 0}>
            Ingest pasted text
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMode('drop');
              setText('');
            }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BaseDropzone onFiles={onFiles} accept={accept} disabled={disabled}>
        {children}
      </BaseDropzone>
      {compact ? null : (
        <div className="flex items-center gap-2">
          {onUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('url')}
              disabled={disabled}
            >
              Paste a URL
            </Button>
          ) : null}
          {onPaste ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode('paste');
                // Focus the textarea after the mode swap.
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }}
              disabled={disabled}
            >
              Paste text
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};