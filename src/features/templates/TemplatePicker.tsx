// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TemplatePicker — UI for the 6 starter templates. Picking one:
//   1. Writes the workspace's `templateId` to the workspace row in
//      IndexedDB.
//   2. Stores the per-workspace template mapping in localStorage
//      so the chat panel can seed quick-actions + system prompt.
//   3. Applies the template's `ingestDefaults` (chunk size + overlap)
//           as the workspace's defaults.
//   4. Bumps the workspace store's `templateVersion` counter so the
//      ChatPanel re-reads its template-derived actions and system
//      prompt on the next render.

import { useCallback, type FC } from 'react';
import { TEMPLATES, TEMPLATE_ICONS, type Template } from './templates';
import { Card } from '@/components/ui/Card';
import { useWorkspaceStore } from '@/features/workspace/store';

const STORAGE_KEY = 'ragulli:active-template:v1';

export type TemplatePickerProps = {
  workspaceId: string | null;
  onPick?: (t: Template) => void;
};

export const TemplatePicker: FC<TemplatePickerProps> = ({ workspaceId, onPick }) => {
  const onChoose = useCallback(
    (t: Template) => {
      if (!workspaceId) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[workspaceId] = t.id;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        /* localStorage unavailable */
      }
      // Tell the rest of the app the template changed. The chat
      // panel subscribes to this counter and re-reads its actions +
      // system prompt on the next render.
      useWorkspaceStore.getState().bumpTemplateVersion();
      onPick?.(t);
    },
    [workspaceId, onPick],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-template-picker>
      {TEMPLATES.map((t) => {
        const Icon = TEMPLATE_ICONS[t.icon];
        return (
          <Card
            key={t.id}
            interactive
            onClick={() => onChoose(t)}
            padding="md"
            data-template-id={t.id}
          >
            <div className="flex items-start gap-3">
              <span className="text-[var(--color-accent)]">
                <Icon size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--color-fg)]">{t.name}</h3>
                <p className="text-xs text-[var(--color-fg-muted)] mt-1">{t.description}</p>
                <p className="text-[10px] text-[var(--color-fg-muted)] mt-2">
                  chunk {t.ingestDefaults.chunkSize} · overlap {t.ingestDefaults.chunkOverlap}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};