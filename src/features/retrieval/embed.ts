// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Main-thread wrapper around the embed worker. We lazily spawn the
// worker on the first call to `embedBatch`, keep a single instance
// alive for the lifetime of the page, and dispatch each batch as a
// separate message keyed by a monotonic id. Responses arrive in
// order on the worker's `message` channel and are resolved into the
// matching pending promise.

import EmbedWorkerCtor from '@/workers/embed.worker.ts?worker';
import { emitTrust } from '@/features/trust/trust-helpers';
import type { EmbedderMessage } from './embed-protocol';

type PendingResolver = {
  resolve: (value: Float32Array[]) => void;
  reject: (reason: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
let announcedModelLoad = false;
const pending = new Map<string, PendingResolver>();

/** Tell the trust panel, once per tab, that the embedding model is
 *  loading. The model is self-hosted, so this is a same-origin fetch
 *  — nothing leaves the browser. We push two entries the first time:
 *  a `model-download` activity that names the origin we would fetch
 *  from if the self-hosted copy were missing (huggingface.co), and a
 *  follow-up `embed` activity confirming the model is now in this
 *  tab. Together they make the trust panel honest about the path:
 *  the embedding model is downloaded once from the configured origin,
 *  cached by the service worker, and never re-fetched for the same
 *  version. */
function announceModelLoad(): void {
  if (announcedModelLoad) return;
  announcedModelLoad = true;
  emitTrust({
    kind: 'model-download',
    summary:
      'Embedding model is downloaded once from huggingface.co, then cached on this site for offline use',
    destination: 'huggingface.co (GET only — public model files, zero user data)',
  });
  emitTrust({
    kind: 'embed',
    summary:
      'Loading the embedding model (MiniLM, about 23 MB) into this tab. It is served from this site, not a third party, and runs entirely in your browser.',
    destination: 'this browser tab',
  });
}

function ensureWorker(): Worker {
  if (worker) return worker;
  announceModelLoad();
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
