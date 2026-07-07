// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Home — the marketing landing page. All seven sections from
// spec §9.1, in order.

import type { FC } from 'react';
import { PageShell } from '../PageShell';
import { Hero } from '../Hero';
import { Wedge } from '../Wedge';
import { Features } from '../Features';
import { Templates } from '../Templates';
import { Trust } from '../Trust';
import { ComparisonTable } from '../ComparisonTable';
import { CTA } from '../CTA';

export const Home: FC = () => (
  <PageShell transparentHeader>
    <Hero />
    <Wedge />
    <Features />
    <Templates />
    <Trust />
    <ComparisonTable />
    <CTA />
  </PageShell>
);