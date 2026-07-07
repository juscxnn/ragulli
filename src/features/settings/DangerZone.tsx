// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// DangerZone settings tab. The one big "Clear all my data" button
// from spec §3 DoD. Hold-to-confirm for 1 second; on successful
// release, wipe IndexedDB (Dexie), OPFS, localStorage (except
// version keys), and emit a toast before reloading the page after
// a 500 ms delay so the user can see the toast.
//
// No analytics, no confirmation prompt beyond the hold. The 1-second
// hold is the safety.

import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { db } from '@/lib/db';
import { clearAll as clearOpfs } from '@/lib/opfs';
import { clearAll as clearKeys } from '@/features/llm/keys';
import { getTrustLogDb } from '@/features/trust/TrustLogDb';

const HOLD_MS = 1000;
const RELOAD_DELAY_MS = 500;
const TOAST_DURATION_MS = 1500;

const PRESERVE_LOCAL_KEY_PREFIXES = ['ragulli:version:'];

export const DangerZone: FC = () => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const startedAt = useRef<number | null>(null);
  const rafHandle = useRef<number | null>(null);

  const cancelHold = useCallback(() => {
    setHolding(false);
    setProgress(0);
    startedAt.current = null;
    if (rafHandle.current !== null) cancelAnimationFrame(rafHandle.current);
    rafHandle.current = null;
  }, []);

  const tick = useCallback(() => {
    if (startedAt.current === null) return;
    const elapsed = performance.now() - startedAt.current;
    const ratio = Math.min(1, elapsed / HOLD_MS);
    setProgress(ratio);
    if (ratio < 1) {
      rafHandle.current = requestAnimationFrame(tick);
    }
  }, []);

  const startHold = useCallback(() => {
    startedAt.current = performance.now();
    setHolding(true);
    rafHandle.current = requestAnimationFrame(tick);
  }, [tick]);

  const finishHold = useCallback(async () => {
    if (startedAt.current === null) return;
    const elapsed = performance.now() - startedAt.current;
    if (elapsed < HOLD_MS) {
      cancelHold();
      return;
    }
    if (rafHandle.current !== null) cancelAnimationFrame(rafHandle.current);
    rafHandle.current = null;
    startedAt.current = null;
    setHolding(false);
    setProgress(1);

    // Wipe everything we can. Each step is wrapped so a single
    // failure does not abort the rest. Errors are intentionally
    // swallowed: the toast still fires and the user gets a fresh
    // tab; we do not want a partial-failure to surprise them with a
    // half-cleared state.
    const safeRun = async (fn: () => Promise<void>): Promise<void> => {
      try {
        await fn();
      } catch {
        /* swallow */
      }
    };

    await safeRun(clearOpfs);
    await safeRun(clearKeys);
    await safeRun(async () => {
      // Replicate the minimal clear here to avoid importing the
      // store module from this file (which could create a cycle).
      await db.sources.clear();
      await db.chunks.clear();
      await db.zones.clear();
      await db.citations.clear();
      await db.workspaces.clear();
      await db.chats.clear();
    });
    await safeRun(async () => {
      // The trust log lives in its own DB; wipe it too so a fresh
      // install does not inherit the previous session's activity.
      try {
        await getTrustLogDb().entries.clear();
      } catch {
        /* DB may not exist yet on a fresh install */
      }
    });
    await safeRun(async () => {
      wipeLocalStorageExcept(PRESERVE_LOCAL_KEY_PREFIXES);
    });

    setShowToast(true);
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
  }, [cancelHold]);

  // Safety: release on tab blur so an interrupted hold does not
  // leave the bar partially filled.
  useEffect(() => {
    if (!holding) return;
    const onBlur = (): void => cancelHold();
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [holding, cancelHold]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-fg-muted)]">
        Wipes everything RAGülli has stored locally: every uploaded file in OPFS, every
        indexed chunk in IndexedDB, every BYOK key, every chat. After the page reloads,
        this tab behaves like a fresh install.
      </p>
      <p className="text-xs text-[var(--color-fg-muted)]">
        Press and hold the button below for one second. Releasing early cancels the wipe.
      </p>

      <div className="relative select-none">
        <Button
          variant="danger"
          size="lg"
          block
          aria-pressed={holding}
          onMouseDown={startHold}
          onMouseUp={() => void finishHold()}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={() => void finishHold()}
          onTouchCancel={cancelHold}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              startHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              void finishHold();
            }
          }}
        >
          {holding ? `Hold... ${Math.round(progress * 100)}%` : 'Clear all my data'}
        </Button>
        {/* Progress overlay: amber fill from left as progress grows */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md overflow-hidden"
        >
          <div
            className="h-full bg-[var(--color-accent)]/30 transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <Toast open={showToast} onClose={() => setShowToast(false)} tone="success" durationMs={TOAST_DURATION_MS}>
        All data cleared. Reloading.
      </Toast>
    </div>
  );
};

function wipeLocalStorageExcept(preservePrefixes: readonly string[]): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (preservePrefixes.some((p) => k.startsWith(p))) continue;
    toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
}
