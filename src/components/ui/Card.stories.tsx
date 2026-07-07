// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Card.

import type { FC } from 'react';
import { Card } from './Card';

export const CardStories: FC = () => (
  <div className="grid grid-cols-2 gap-6 p-6">
    <Card>
      <h3 className="text-base font-medium text-[var(--color-fg)]">Quiet card</h3>
      <p className="text-sm text-[var(--color-fg-muted)] mt-1">A source on the canvas, at rest.</p>
    </Card>
    <Card interactive>
      <h3 className="text-base font-medium text-[var(--color-fg)]">Interactive card</h3>
      <p className="text-sm text-[var(--color-fg-muted)] mt-1">Hover for the soft amber ring.</p>
    </Card>
    <Card padding="lg">
      <h3 className="text-lg font-medium text-[var(--color-fg)]">Generous padding</h3>
      <p className="text-sm text-[var(--color-fg-muted)] mt-2">Used for the chat empty state.</p>
    </Card>
    <Card padding="sm">
      <span className="text-xs text-[var(--color-fg-muted)]">Compact padding</span>
    </Card>
  </div>
);

export default CardStories;
