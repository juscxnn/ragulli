// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// WeightSlider — the per-zone weight control. Re-exported from the
// generic ui/Slider so the import path lives next to the canvas code.
// Range is 0..2.0, step 0.05, default 1.0 per spec Scene 5. The
// label "weight" sits in front of the slider so the row reads as
// "weight 0.85 [============]" — matches the Linear/Figma knob feel.

import { Slider } from '@/components/ui/Slider';
import type { FC } from 'react';

export type WeightSliderProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
};

export const WeightSlider: FC<WeightSliderProps> = ({ value, onChange, id }) => (
  <div className="flex items-center gap-3 px-1 min-w-[200px]">
    <span className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)] shrink-0">
      weight
    </span>
    <div className="flex-1">
      <Slider
        id={id}
        value={value}
        min={0}
        max={2}
        step={0.05}
        onChange={onChange}
        label=""
      />
    </div>
    <span className="text-xs text-[var(--color-fg)] tabular-nums w-10 text-right">
      {value.toFixed(2)}
    </span>
  </div>
);