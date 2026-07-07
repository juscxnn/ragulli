// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Canvas — the spatial workspace where sources live as cards. Subagent D
// owns the drag-drop, group, and weight logic. This is a placeholder.

import type { FC } from 'react';
import { CanvasCard } from './Card';
import { Zone } from './Zone';
import { WeightSlider } from './WeightSlider';

export const Canvas: FC = () => (
  <div className="flex flex-col gap-6 p-6 h-full">
    <Zone title="Trusted" weight={1.5} color="#E0B158">
      <CanvasCard title="Drop PDFs you trust here." />
    </Zone>
    <Zone title="Background" weight={0.6} color="#8FA396">
      <CanvasCard title="Background context goes here." />
    </Zone>
    <WeightSlider label="Default weight" value={1} onChange={() => undefined} />
  </div>
);
