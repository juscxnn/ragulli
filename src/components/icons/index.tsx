// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Small SVG icon set used across the UI. Each icon is a React FC that
// renders a currentColor SVG so it inherits text color. The set covers
// the four input kinds, the four sample sources, and a few utility icons.

import type { FC, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Base: FC<IconProps & { children: React.ReactNode; viewBox?: string }> = ({
  size = 20,
  viewBox = '0 0 24 24',
  children,
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const PdfIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h2M9 17h4M13 13h2" />
  </Base>
);

export const UrlIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M10 14a5 5 0 0 0 7.07 0l1.42-1.42a5 5 0 0 0-7.07-7.07L10 6.93" />
    <path d="M14 10a5 5 0 0 0-7.07 0l-1.42 1.42a5 5 0 0 0 7.07 7.07L14 17.07" />
  </Base>
);

export const TextIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h10M4 18h16" />
  </Base>
);

export const AudioIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M3 10v4h3l5 4V6L6 10H3z" />
    <path d="M16 8a5 5 0 0 1 0 8" />
  </Base>
);

export const GearIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);

export const InfoIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v4h1" />
  </Base>
);

export const BookIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
    <path d="M4 17h14" />
  </Base>
);

export const ContractIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M7 3h10l3 3v15a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M9 8h8M9 12h8M9 16h5" />
  </Base>
);

export const ChapterIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 4h6a4 4 0 0 1 4 4v12" />
    <path d="M20 4h-6a4 4 0 0 0-4 4v12" />
  </Base>
);

export const ArticleIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 9h10M7 13h10M7 17h6" />
  </Base>
);

export const CloseIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const CheckIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12l5 5L20 7" />
  </Base>
);

export const ChevronDownIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);
