// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustPanel — the always-visible UI surface that says, in plain English,
// where bytes are going. Compact state is a chip in the bottom-right;
// active state is a side panel. Subagent D implements the active view.

import type { FC } from 'react';
import { useTrustLog } from './TrustLog';
import { Chip } from '@/components/ui/Chip';

export const TrustPanel: FC = () => {
  const log = useTrustLog((s) => s.entries);
  const recent = log.slice(-4);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      <Chip tone="accent" leadingDot>
        no account · no server · no telemetry
      </Chip>
      {recent.length > 0 ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-xs text-[var(--color-fg-muted)] max-w-xs shadow-[var(--shadow-soft)]">
          <ul className="flex flex-col gap-1">
            {recent.map((entry) => (
              <li key={entry.id}>
                <span className="text-[var(--color-fg)]">{entry.summary}</span>
                {entry.destination ? (
                  <span className="text-[var(--color-fg-muted)]"> · {entry.destination}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
