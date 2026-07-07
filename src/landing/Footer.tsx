// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — Footer.

import type { FC } from 'react';

export const Footer: FC = () => (
  <footer className="px-6 py-10 border-t border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] text-center">
    <p>RAGülli is open source under the AGPL-3.0 license.</p>
    <p className="mt-2">No analytics. No telemetry. Made with restraint.</p>
  </footer>
);
