// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Wordmark — the brand mark + "RAGülli" wordmark used across the
// landing site. The mark is the same two-amber-dots composition
// used in public/logo-mark.svg, inlined as a React component to
// avoid the extra HTTP request on the landing page.
//
// The diaeresis on the "u" is preserved byte-for-byte as U+0308
// (combining diaeresis) by using a literal Unicode string, so the
// rendered DOM matches the spec exactly.

import type { FC } from 'react';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
};

const SIZES = {
  sm: { mark: 20, fontSize: 'text-base', gap: 'gap-2' },
  md: { mark: 26, fontSize: 'text-xl', gap: 'gap-2.5' },
  lg: { mark: 36, fontSize: 'text-3xl', gap: 'gap-3' },
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
        <rect width="512" height="512" rx="112" ry="112" fill="#0B2027" />
        <circle cx="194" cy="256" r="56" fill="#E0B158" />
        <circle cx="318" cy="256" r="56" fill="#E0B158" />
      </svg>
      <span className={`font-serif font-medium text-[var(--color-fg)] ${s.fontSize}`}>
        RAG<span className="relative inline-block">
          u
          <span
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 flex gap-[3px]"
            style={{ top: '-0.32em' }}
          >
            <span className="block w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]" />
            <span className="block w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]" />
          </span>
        </span>lli
      </span>
      {showTagline ? (
        <span className="hidden sm:inline text-xs text-[var(--color-fg-muted)] ml-3 font-sans">
          Your files. Your AI. Your browser.
        </span>
      ) : null}
    </span>
  );
};