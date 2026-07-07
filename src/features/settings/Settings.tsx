// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Settings — modal placeholder. Subagent C wires the actual controls.

import { useState, type FC } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export const Settings: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [tab, setTab] = useState<'model' | 'ingest' | 'danger' | 'about'>('model');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      description="Configure your model, ingest defaults, and danger zone."
      width="lg"
    >
      <nav className="flex gap-1 border-b border-[var(--color-border)] mb-4">
        {(['model', 'ingest', 'danger', 'about'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm border-b-2 ${
              tab === t
                ? 'border-[var(--color-accent)] text-[var(--color-fg)]'
                : 'border-transparent text-[var(--color-fg-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === 'model' ? <p className="text-sm">Model selection — Subagent C will fill.</p> : null}
      {tab === 'ingest' ? <p className="text-sm">Ingest defaults — Subagent C will fill.</p> : null}
      {tab === 'danger' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Clear all local data — Subagent C wires the hold-to-confirm.</p>
          <Button variant="danger">Clear all data</Button>
        </div>
      ) : null}
      {tab === 'about' ? (
        <p className="text-sm">RAGülli v0.1.0. AGPL-3.0. No analytics, no telemetry.</p>
      ) : null}
    </Dialog>
  );
};
