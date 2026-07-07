// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// PageShell — wraps every landing page in the same outer chrome
// (header, main, footer). Used by Home, Template, Compare, Privacy.

import type { FC, ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { Footer } from './Footer';

type Props = {
  children: ReactNode;
  ctaHref?: string;
  /** When true, the header is rendered transparent over the page top.
   *  Default: false (solid background, which is what every sub-page
   *  uses). The home page sets this to true to let the Hero's top
   *  padding handle the spacing. */
  transparentHeader?: boolean;
};

export const PageShell: FC<Props> = ({ children, ctaHref, transparentHeader }) => (
  <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
    {transparentHeader ? (
      <div className="sticky top-0 z-20">
        <SiteHeader ctaHref={ctaHref} />
      </div>
    ) : (
      <SiteHeader ctaHref={ctaHref} />
    )}
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);