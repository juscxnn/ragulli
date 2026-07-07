// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing-page icon set. These are decorative SVG icons used in the
// marketing site. They are intentionally separate from the
// app's src/components/icons set so the landing bundle stays slim and
// the marketing visual language can evolve independently.
//
// Each icon is a React FC that renders a currentColor SVG; the size
// prop controls both width and height. Icons are stroke-based by
// default (the visual language is editorial / hand-drawn).

import type { FC, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Base: FC<IconProps & { children: React.ReactNode; viewBox?: string }> = ({
  size = 22,
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
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const DropIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12 3v12" />
    <path d="M7 8l5-5 5 5" />
    <path d="M5 21h14" />
  </Base>
);

export const SampleIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
  </Base>
);

export const InstallIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <rect x="4" y="17" width="16" height="4" rx="1" />
  </Base>
);

export const AccountIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
    <path d="M4 4l16 16" />
  </Base>
);

export const OfflineIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12a7 7 0 0 1 14 0" />
    <path d="M8 12a4 4 0 0 1 8 0" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);

export const CitationIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M9 17l-2 2-3-3 5-5 2 2" />
    <path d="M13 7l4-4 4 4-4 4-2-2" />
    <path d="M11 9l4 4" />
  </Base>
);

export const ArrowRightIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </Base>
);

export const ArrowLeftIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="M11 5l-7 7 7 7" />
  </Base>
);

export const CheckSmallIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12l4 4 10-10" />
  </Base>
);

export const DashIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 12h12" />
  </Base>
);

export const XSmallIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const GitHubIcon: FC<IconProps> = (p) => (
  <Base {...p} viewBox="0 0 24 24">
    <path d="M9 19c-4 1.5-4-2.5-6-2.5M15 22v-3.9a3.4 3.4 0 0 0-1-2.7c3.3-.4 6.7-1.6 6.7-7.2A5.5 5.5 0 0 0 19 4.8 5.2 5.2 0 0 0 18.9 1S17.7.6 15 2.4a13 13 0 0 0-6 0C6.3.6 5.1 1 5.1 1A5.2 5.2 0 0 0 5 4.8a5.5 5.5 0 0 0-1.7 4.4c0 5.6 3.4 6.8 6.7 7.2a3.4 3.4 0 0 0-1 2.7V22" />
  </Base>
);

export const BookLandingIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
    <path d="M4 17h14" />
    <path d="M9 7h7M9 11h5" />
  </Base>
);

export const ContractLandingIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M7 3h10l3 3v15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M16 3v6h4" />
    <path d="M9 13h8M9 17h5" />
  </Base>
);

export const MicIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Base>
);

export const ChapterLandingIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 4h6a4 4 0 0 1 4 4v12" />
    <path d="M20 4h-6a4 4 0 0 0-4 4v12" />
    <path d="M8 9h2M16 9h-2" />
  </Base>
);

export const ArticleLandingIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 9h10M7 13h10M7 17h6" />
  </Base>
);

export const BriefcaseIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </Base>
);

export const ShieldIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const LinkIcon: FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M10 14a5 5 0 0 0 7.07 0l1.42-1.42a5 5 0 0 0-7.07-7.07L10 6.93" />
    <path d="M14 10a5 5 0 0 0-7.07 0l-1.42 1.42a5 5 0 0 0 7.07 7.07L14 17.07" />
  </Base>
);