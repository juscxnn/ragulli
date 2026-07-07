// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Non-component helpers around the trust log. Kept in their own file
// so the TrustPanel component file only exports components (and
// HMR/Fast Refresh works cleanly).

import { v4 as uuidv4 } from 'uuid';
import { useTrustLog } from './TrustLog';
import type { TrustActivity } from '@/features/llm/types';

/** Push a single trust entry from a non-UI path (e.g. the Danger
 *  Zone clear-data flow, or a fetch path that doesn't render). */
export function pushTrustEntry(entry: TrustActivity): void {
  useTrustLog.getState().push(entry);
}

/** Generate a trust id and push in one call. */
export function emitTrust(
  partial: Omit<TrustActivity, 'id' | 'ts'>,
): TrustActivity {
  const activity: TrustActivity = {
    id: uuidv4(),
    ts: Date.now(),
    ...partial,
  };
  pushTrustEntry(activity);
  return activity;
}