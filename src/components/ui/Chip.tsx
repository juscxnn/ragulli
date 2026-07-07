// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Chip — small inline label, used for status, filters, and tags.

import type { FC, HTMLAttributes, ReactNode } from 'react';

export type ChipTone = 'neutral' | 'accent' | 'success' | 'danger';

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  size?: 'sm' | 'md';
  leadingDot?: boolean;
  children?: ReactNode;
};

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-[var(--color-surface-1)] text-[var(--color-fg-muted)] border border-[var(--color-border)]',
  accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
};

const SIZE = { sm: 'h-6 px-2 text-[11px]', md: 'h-7 px-2.5 text-xs' } as const;

const DOT_COLOR: Record<ChipTone, string> = {
  neutral: 'bg-[var(--color-fg-muted)]',
  accent: 'bg-[var(--color-accent)]',
  success: 'bg-[var(--color-success)]',
  danger: 'bg-[var(--color-danger)]',
};

export const Chip: FC<ChipProps> = ({
  tone = 'neutral',
  size = 'md',
  leadingDot = false,
  className,
  children,
  ...rest
}) => {
  const classes = [
    'inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide uppercase',
    TONE[tone],
    SIZE[size],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {leadingDot ? <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[tone]}`} aria-hidden /> : null}
      {children}
    </span>
  );
};
