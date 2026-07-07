// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ChatPanel — right column. Empty state with the 4 quick actions per
// spec §6 Scene 3.

import type { FC } from 'react';
import { QuickActions } from './QuickActions';

export const ChatPanel: FC = () => (
  <div className="flex flex-col h-full p-6 gap-6">
    <div className="flex-1 flex items-center justify-center text-center">
      <div>
        <p className="text-sm text-[var(--color-fg-muted)]">Drop a file to start</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">
          Every answer cites the line. Every byte stays in this tab.
        </p>
      </div>
    </div>
    <QuickActions />
  </div>
);
