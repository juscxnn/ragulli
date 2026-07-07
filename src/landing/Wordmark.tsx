// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Wordmark — the logo mark + wordmark used across the landing site.
// Reads the umlaut-bearing wordmark as a literal Unicode string so the
// U+0308 (combining diaeresis) is preserved byte-for-byte in the
// rendered DOM. The mark is the same library-stamp SVG used in
// public/logo-mark.svg, inlined as a React component to avoid the
// extra HTTP request on the landing page.

import type { FC } from 'react';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
};

const SIZES = {
  sm: { mark: 22, fontSize: 'text-base', gap: 'gap-2' },
  md: { mark: 28, fontSize: 'text-xl', gap: 'gap-2.5' },
  lg: { mark: 40, fontSize: 'text-3xl', gap: 'gap-3' },
} as const;

export const Wordmark: FC<Props> = ({ size = 'md', showTagline = false }) => {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap} leading-none`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={s.mark}
        height={s.mark}
        viewBox="0 0 512 512"
        aria-hidden="true"
        role="img"
      >
        <rect width="512" height="512" rx="96" fill="#0B2027" />
        <g
          transform="translate(96 96)"
          fill="none"
          stroke="#E0B158"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M40 40 L40 280" />
          <path d="M40 40 L40 280 L200 240 L200 0 Z" fill="#E0B158" fillOpacity="0.1" />
          <line x1="220" y1="80" x2="380" y2="80" />
          <line x1="220" y1="160" x2="380" y2="160" />
          <line x1="220" y1="240" x2="320" y2="240" />
        </g>
      </svg>
      <span className={`font-serif font-medium text-[var(--color-fg)] ${s.fontSize}`}>
        RAGülli
      </span>
      {showTagline ? (
        <span className="hidden sm:inline text-xs text-[var(--color-fg-muted)] ml-3 font-sans">
          Your files. Your AI. Your browser.
        </span>
      ) : null}
    </span>
  );
};