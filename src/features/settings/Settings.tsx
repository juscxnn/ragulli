// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Settings — modal with four tabs. Subagent C owns the back-end and
// the tabs; Subagent D polishes the styling and integration later.

import { useState, type FC } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { ModelSelection } from './ModelSelection';
import { IngestDefaults } from './IngestDefaults';
import { DangerZone } from './DangerZone';
import { About } from './About';

type TabId = 'model' | 'ingest' | 'danger' | 'about';

const TABS: Array<{ id: TabId; label: string; description: string }> = [
  { id: 'model', label: 'Model', description: 'Pick a provider and add a key.' },
  { id: 'ingest', label: 'Ingest', description: 'Defaults for chunking and templates.' },
  { id: 'danger', label: 'Danger zone', description: 'Wipe everything on this device.' },
  { id: 'about', label: 'About', description: 'Version, license, and the trust pledge.' },
];

export const Settings: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [tab, setTab] = useState<TabId>('model');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      description="Configure your model, ingest defaults, and privacy."
      width="lg"
    >
      <nav
        role="tablist"
        aria-label="Settings sections"
        className="flex gap-1 border-b border-[var(--color-border)] mb-4"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[var(--color-accent)] text-[var(--color-fg)]'
                : 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <p className="text-xs text-[var(--color-fg-muted)] mb-4">
        {TABS.find((t) => t.id === tab)?.description}
      </p>
      {tab === 'model' ? <ModelSelection /> : null}
      {tab === 'ingest' ? <IngestDefaults /> : null}
      {tab === 'danger' ? <DangerZone /> : null}
      {tab === 'about' ? <About /> : null}
    </Dialog>
  );
};
