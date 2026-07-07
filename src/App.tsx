// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// App — single-page shell. Topbar (logo + tagline + info + settings).
// Center: the FirstDrop hero. Bottom-right: trust chip.

import { useState, type FC } from 'react';
import { GearIcon, InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { FirstDrop } from '@/features/dropzone/FirstDrop';
import { TrustPanel } from '@/features/trust/TrustPanel';
import { Settings } from '@/features/settings/Settings';
import logoMark from '/logo-mark.svg';

export const App: FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="RAGülli" width={28} height={28} />
          <span className="font-serif text-lg text-[var(--color-fg)]">RAGülli</span>
          <span className="hidden sm:inline text-xs text-[var(--color-fg-muted)] ml-2">
            Your files. Your AI. Your browser.
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="What is RAGülli?"
            leadingIcon={<InfoIcon size={16} />}
          >
            ?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Open settings"
            leadingIcon={<GearIcon size={16} />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <FirstDrop disabled />
      </main>

      <TrustPanel />

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
