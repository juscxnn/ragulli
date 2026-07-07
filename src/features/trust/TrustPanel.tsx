// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustPanel — the always-visible surface that says, in plain English,
// where bytes are going. Three render modes:
//   - compact (idle): a small chip in the bottom-right. Hover
//     expands to show the last 4 actions. Click pins to the side.
//   - pinned (idle): a permanent side panel on the right.
//   - active (busy): the panel takes over the bottom-right with the
//     "what's happening now" view from spec §8.4.
//
// The trust chip line "no account • no server • no telemetry" is
// permanently pinned to the bottom-left per spec Scene 1.

import { useEffect, useState, type FC } from 'react';
import { useTrustLog } from './TrustLog';
import { useWorkspaceStore } from '@/features/workspace/store';
import { Chip } from '@/components/ui/Chip';
import { CloseIcon } from '@/components/icons';
import type { TrustActivity } from '@/features/llm/types';

type Mode = 'compact' | 'pinned' | 'active';

export const TrustPanel: FC = () => {
  const entries = useTrustLog((s) => s.entries);
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);

  const [mode, setMode] = useState<Mode>('compact');
  const [hovered, setHovered] = useState(false);
  const recent = entries.slice(-4).reverse();

  // When an ingest starts (or another trust-generating event fires
  // while we're idle), bump the panel into its active state. We
  // don't try to detect "done" precisely — the panel collapses back
  // to compact after a 2s grace period of no progress activity.
  const [activeCount, setActiveCount] = useState(0);
  useEffect(() => {
    if (ingestProgress && ingestProgress.phase !== 'done' && ingestProgress.phase !== 'error') {
      setMode((m) => (m === 'pinned' ? m : 'active'));
      setActiveCount((n) => n + 1);
      const handle = window.setTimeout(() => {
        setMode((m) => (m === 'pinned' ? m : 'compact'));
      }, 2500);
      return () => window.clearTimeout(handle);
    }
    return undefined;
  }, [ingestProgress]);

  // Promote to active when a fresh trust-relevant entry lands in
  // the log. Any file/chunk/embed/model-download/model-call/
  // model-response entry counts as "something is happening now".
  useEffect(() => {
    const last = entries[entries.length - 1];
    if (!last) return;
    if (
      last.kind !== 'model-call' &&
      last.kind !== 'model-response' &&
      last.kind !== 'file' &&
      last.kind !== 'chunk' &&
      last.kind !== 'embed' &&
      last.kind !== 'model-download'
    ) {
      return;
    }
    setMode((m) => (m === 'pinned' ? m : 'active'));
    const handle = window.setTimeout(() => {
      setMode((m) => (m === 'pinned' ? m : 'compact'));
    }, 2500);
    return () => window.clearTimeout(handle);
  }, [entries, activeCount]);

  const onClickChip = (): void => {
    setMode((m) => (m === 'pinned' ? 'compact' : 'pinned'));
  };

  const showExpanded = mode === 'active' || mode === 'pinned' || (mode === 'compact' && hovered);

  return (
    <>
      {/* Bottom-left trust chip — always visible per Scene 1 */}
      <div className="fixed bottom-4 left-4 z-30">
        <Chip tone="accent" size="sm" leadingDot>
          no account · no server · no telemetry
        </Chip>
      </div>

      {/* Bottom-right trust panel */}
      <div
        className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2"
        onMouseLeave={() => setHovered(false)}
      >
        <button
          type="button"
          aria-label={mode === 'pinned' ? 'Unpin trust panel' : 'Open trust panel'}
          aria-expanded={mode !== 'compact' || hovered}
          onClick={onClickChip}
          onMouseEnter={() => setHovered(true)}
          className={`group flex items-center gap-2 rounded-full border px-3 h-8 text-[11px] uppercase tracking-wide transition-colors ${
            mode === 'active'
              ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
              : mode === 'pinned'
                ? 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-fg)]'
                : 'bg-[var(--color-surface-1)] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          <span
            aria-hidden
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              mode === 'active'
                ? 'bg-[var(--color-accent)] animate-pulse'
                : 'bg-[var(--color-success)]'
            }`}
          />
          {mode === 'active' ? 'trust · active' : 'trust'}
          {mode === 'pinned' ? (
            <span aria-hidden className="ml-1">
              <CloseIcon size={12} />
            </span>
          ) : null}
        </button>

        {showExpanded ? (
          <div
            role="region"
            aria-label="Trust panel"
            className={`w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-soft)] ${
              mode === 'pinned' ? '' : 'animate-in fade-in duration-150'
            }`}
          >
            <header className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
                {mode === 'active' ? "what's happening now" : 'last 4 actions'}
              </h3>
              {mode === 'pinned' ? (
                <button
                  type="button"
                  onClick={() => setMode('compact')}
                  aria-label="Unpin trust panel"
                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                >
                  <CloseIcon size={14} />
                </button>
              ) : null}
            </header>
            <div className="px-3 py-3">
              {mode === 'active' ? (
                <ActiveView entries={entries} ingestProgress={ingestProgress} />
              ) : recent.length === 0 ? (
                <p className="text-xs text-[var(--color-fg-muted)]">
                  Drop a file. Nothing has left this tab.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {recent.map((entry) => (
                    <li
                      key={entry.id}
                      className="text-xs leading-snug text-[var(--color-fg-muted)]"
                    >
                      <span className="text-[var(--color-fg)]">{entry.summary}</span>
                      {entry.destination ? (
                        <>
                          {' · '}
                          <span>{entry.destination}</span>
                        </>
                      ) : null}
                    </li>
                  ))}
                  <li className="text-[11px] text-[var(--color-fg-muted)] mt-1 italic">
                    nothing uploaded to a server
                  </li>
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

type ActiveViewProps = {
  entries: TrustActivity[];
  ingestProgress: ReturnType<typeof useWorkspaceStore.getState>['ingestProgress'];
};

const ActiveView: FC<ActiveViewProps> = ({ entries, ingestProgress }) => {
  const lastModelCall = [...entries].reverse().find((e) => e.kind === 'model-call');
  const lastModelResponse = [...entries].reverse().find((e) => e.kind === 'model-response');
  const lastFile = [...entries].reverse().find((e) => e.kind === 'file');

  return (
    <div className="flex flex-col gap-3 text-xs">
      {lastFile ? (
        <div>
          <div className="text-[var(--color-fg)]">{lastFile.summary}</div>
          <ul className="mt-1 ml-2 flex flex-col gap-0.5 text-[var(--color-fg-muted)]">
            <li>· parsed: local browser</li>
            <li>· chunked: local browser</li>
            <li>
              · embedded:{' '}
              {ingestProgress && ingestProgress.phase === 'embed'
                ? `embedding ${Math.round(ingestProgress.ratio * 100)}%`
                : 'local browser'}
            </li>
            <li>· sent to: NOT SENT to anywhere yet</li>
          </ul>
        </div>
      ) : null}
      {lastModelCall ? (
        <div>
          <div className="text-[var(--color-fg)]">{lastModelCall.summary}</div>
          <ul className="mt-1 ml-2 flex flex-col gap-0.5 text-[var(--color-fg-muted)]">
            <li>
              · sent to: {lastModelCall.destination ?? 'unconfigured'}
            </li>
            {lastModelCall.destination?.includes('Edge') ? (
              <li>
                · (anthropic only: passed through stateless Edge function for CORS)
              </li>
            ) : null}
            <li>
              · response:{' '}
              {lastModelResponse ? 'received in this tab' : 'streaming in this tab'}
            </li>
          </ul>
        </div>
      ) : null}
      {!lastFile && !lastModelCall ? (
        <p className="text-[var(--color-fg-muted)]">Idle. Nothing in flight.</p>
      ) : null}
    </div>
  );
};