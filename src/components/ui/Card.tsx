// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Card — the source-card primitive used on the workspace canvas. Subtle
// border, soft shadow, optional hover ring (used when draggable).

import type { FC, HTMLAttributes, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  className,
  ...rest
}) => {
  const classes = [
    'bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-soft)]',
    PADDING[padding],
    interactive
      ? 'transition-[border-color,box-shadow] duration-150 hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow)] cursor-pointer'
      : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};
