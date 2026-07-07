// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TemplatePicker — UI for the 6 starter templates. Disabled state until
// Subagent D wires the ingest pipeline (the picker already lets users
// pick; the actual template application waits on the pipeline).

import type { FC } from 'react';
import { TEMPLATES, TEMPLATE_ICONS, type Template } from './templates';
import { Card } from '@/components/ui/Card';

export type TemplatePickerProps = {
  onPick?: (t: Template) => void;
  disabled?: boolean;
};

export const TemplatePicker: FC<TemplatePickerProps> = ({ onPick, disabled = true }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TEMPLATES.map((t) => {
        const Icon = TEMPLATE_ICONS[t.icon];
        return (
          <Card
            key={t.id}
            interactive={!disabled}
            onClick={() => !disabled && onPick?.(t)}
            padding="md"
          >
            <div className="flex items-start gap-3">
              <span className="text-[var(--color-accent)]">
                <Icon size={22} />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[var(--color-fg)]">{t.name}</h3>
                <p className="text-xs text-[var(--color-fg-muted)] mt-1">{t.description}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
