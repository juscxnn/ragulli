// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// WeightSlider — the per-zone weight control. Re-exported from the
// generic ui/Slider so the import path lives next to the canvas code.

import { Slider, type SliderProps } from '@/components/ui/Slider';
import type { FC } from 'react';

export const WeightSlider: FC<SliderProps> = (props) => (
  <div className="px-1">
    <Slider {...props} />
  </div>
);
