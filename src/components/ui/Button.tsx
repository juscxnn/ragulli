// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Button — the only interactive primitive we use. Dark-theme default.
// Variants: primary (amber), secondary (slate), ghost (transparent).

import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  block?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-bg)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/40',
  ghost: 'bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-1)]',
  danger: 'bg-[var(--color-danger)] text-[var(--color-fg)] hover:brightness-110',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-md',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-5 text-base rounded-lg',
};

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  block,
  className,
  children,
  type,
  ...rest
}) => {
  const classes = [
    'inline-flex items-center justify-center gap-2 font-medium transition-[filter,background,border,color] duration-150 focus:outline-none focus-visible:shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:cursor-not-allowed select-none',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    block ? 'w-full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
};
