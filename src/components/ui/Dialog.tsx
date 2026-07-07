// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Dialog — minimal modal. Backdrop click + Esc close by default.

import { useEffect, useRef, type FC, type ReactNode } from 'react';
import { CloseIcon } from '@/components/icons';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
};

const WIDTH = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

export const Dialog: FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative w-full ${WIDTH[width]} rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-soft)] focus:outline-none`}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 id="dialog-title" className="text-base font-medium text-[var(--color-fg)]">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-[var(--color-fg-muted)] mt-1">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1 -m-1 rounded"
          >
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="p-5 text-sm text-[var(--color-fg)] max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer ? (
          <footer className="p-5 border-t border-[var(--color-border)] flex justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
};
