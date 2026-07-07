// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Chip.

import type { FC } from 'react';
import { Chip } from './Chip';

export const ChipStories: FC = () => (
  <div className="flex flex-wrap gap-3 p-6">
    <Chip tone="neutral">no account</Chip>
    <Chip tone="neutral" leadingDot>
      idle
    </Chip>
    <Chip tone="accent" leadingDot>
      embedding
    </Chip>
    <Chip tone="success" leadingDot>
      done
    </Chip>
    <Chip tone="danger" leadingDot>
      failed
    </Chip>
    <Chip tone="accent" size="sm">
      PDF
    </Chip>
  </div>
);

export default ChipStories;
