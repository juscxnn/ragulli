// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Main-thread wrapper around the embed worker. We lazily spawn the
// worker on the first call to `embedBatch`, keep a single instance
// alive for the lifetime of the page, and dispatch each batch as a
// separate message keyed by a monotonic id. Responses arrive in
// order on the worker's `message` channel and are resolved into the
// matching pending promise.

import EmbedWorkerCtor from '@/workers/embed.worker.ts?worker';
import type { EmbedderMessage } from './embed-protocol';

type PendingResolver = {
  resolve: (value: Float32Array[]) => void;
  reject: (reason: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<string, PendingResolver>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new EmbedWorkerCtor();
  worker.addEventListener('message', (event: MessageEvent<EmbedderMessage>) => {
    const msg = event.data;
    if (msg.type === 'embed:result') {
      const resolver = pending.get(msg.id);
      if (!resolver) return;
      pending.delete(msg.id);
      // The worker sends `number[][]` over the postMessage channel;
      // we convert each row to a Float32Array for downstream use.
      const out: Float32Array[] = msg.embeddings.map((row) => Float32Array.from(row));
      resolver.resolve(out);
      return;
    }
    if (msg.type === 'embed:error') {
      const resolver = pending.get(msg.id);
      if (!resolver) return;
      pending.delete(msg.id);
      resolver.reject(new Error(msg.message));
    }
  });
  worker.addEventListener('error', (event) => {
    const err = new Error(event.message || 'Embed worker crashed');
    for (const [, resolver] of pending) resolver.reject(err);
    pending.clear();
  });
  return worker;
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const w = ensureWorker();
  const id = `emb-${nextId}`;
  nextId += 1;
  return new Promise<Float32Array[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'embed', id, chunks: texts });
  });
}

/** Test-only: replace the worker constructor (used to inject a fake). */
export function _setWorkerFactoryForTests(factory: () => Worker | null): void {
  // Drain any in-flight requests so they don't leak.
  for (const [, resolver] of pending) resolver.reject(new Error('Worker replaced'));
  pending.clear();
  worker = factory();
}
