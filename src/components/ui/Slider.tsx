// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Slider — a styled range input. Used for zone weight, chunk size, etc.

import type { ChangeEvent, FC } from 'react';

export type SliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  id?: string;
};

export const Slider: FC<SliderProps> = ({
  value,
  min = 0,
  max = 2,
  step = 0.05,
  onChange,
  label,
  id,
}) => {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));
  const inputId = id ?? `slider-${label?.replace(/\s+/g, '-').toLowerCase() ?? 'value'}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs text-[var(--color-fg-muted)]">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        className="w-full accent-[var(--color-accent)]"
      />
      <span className="text-xs text-[var(--color-fg-muted)] tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
};
