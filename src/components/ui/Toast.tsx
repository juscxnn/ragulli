// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Toast — transient feedback at the bottom of the screen. Self-dismissing.

import { useEffect, useState, type FC, type ReactNode } from 'react';

export type ToastTone = 'info' | 'success' | 'danger';

export type ToastProps = {
  open: boolean;
  onClose: () => void;
  tone?: ToastTone;
  children: ReactNode;
  durationMs?: number;
};

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-fg)]',
  success: 'border-[var(--color-success)]/40 bg-[var(--color-surface-2)] text-[var(--color-fg)]',
  danger: 'border-[var(--color-danger)]/40 bg-[var(--color-surface-2)] text-[var(--color-fg)]',
};

export const Toast: FC<ToastProps> = ({ open, onClose, tone = 'info', children, durationMs = 4000 }) => {
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    setVisible(open);
    if (!open) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-[var(--shadow-soft)] ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  );
};
