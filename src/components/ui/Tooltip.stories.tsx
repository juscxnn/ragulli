// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Tooltip.

import type { FC } from 'react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

export const TooltipStories: FC = () => (
  <div className="flex items-center gap-4 p-8">
    <Tooltip content="The user is informed first.">
      <Button variant="secondary">Hover me</Button>
    </Tooltip>
    <Tooltip content="Embedded locally. Sent nowhere." side="bottom">
      <span className="text-sm text-[var(--color-fg-muted)] underline decoration-dotted cursor-help">
        what does this mean?
      </span>
    </Tooltip>
  </div>
);

export default TooltipStories;
