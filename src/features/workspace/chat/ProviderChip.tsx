// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ProviderChip — the always-visible indicator of which LLM provider
// is active. Click to open a small menu of providers; pick one and
// it becomes active immediately. This is the fix for "I saved my key
// but the chat panel still says no model is connected": previously
// the active provider was invisible and required opening Settings.

import { useEffect, useRef, useState, type FC } from 'react';
import {
  getAvailableProviders,
  useProviderStore,
} from '@/features/llm/provider-registry';
import { hasKey } from '@/features/llm/keys';

export const ProviderChip: FC = () => {
  const active = useProviderStore((s) => s.activeProviderId);
  const setActive = useProviderStore((s) => s.setActiveProvider);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const providers = getAvailableProviders();
  const activeDescriptor = providers.find((p) => p.id === active);
  const activeNeedsKey = activeDescriptor?.needsKey ?? false;
  const activeHasKey = hasKey(active);
  const showWarning = activeNeedsKey && !activeHasKey;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] border transition-colors',
          showWarning
            ? 'border-[var(--color-accent)]/40 text-[var(--color-accent)] bg-[var(--color-accent)]/8 hover:bg-[var(--color-accent)]/14'
            : 'border-[var(--color-border)] text-[var(--color-fg-muted)] bg-[var(--color-surface-2)] hover:border-[var(--color-fg-muted)]',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="provider-chip"
      >
        <span
          className={[
            'inline-block w-1.5 h-1.5 rounded-full',
            showWarning
              ? 'bg-[var(--color-accent)]'
              : activeHasKey || !activeNeedsKey
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-fg-muted)]',
          ].join(' ')}
          aria-hidden
        />
        <span className="font-medium">
          {activeDescriptor?.label ?? active}
        </span>
        <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden>
          <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl shadow-black/30"
        >
          {providers.map((p) => {
            const isActive = p.id === active;
            const hasK = hasKey(p.id);
            const warning = p.needsKey && !hasK;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setActive(p.id);
                  setOpen(false);
                }}
                className={[
                  'w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-[12px] first:rounded-t-lg last:rounded-b-lg transition-colors',
                  isActive
                    ? 'bg-[var(--color-surface-2)]'
                    : 'hover:bg-[var(--color-surface-1)]',
                ].join(' ')}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[var(--color-fg)] font-medium">{p.label}</span>
                  <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                    {p.defaultModel}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {warning ? (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
                      no key
                    </span>
                  ) : hasK || !p.needsKey ? (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-success)]">
                      ready
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
                      aria-label="Active"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
          <div className="border-t border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-fg-muted)]">
            Click a provider to switch. Open Settings for keys and model overrides.
          </div>
        </div>
      ) : null}
    </div>
  );
};