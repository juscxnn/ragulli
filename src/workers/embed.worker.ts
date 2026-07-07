// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Embedding Web Worker. Runs Transformers.js (bge-small-en-v1.5) off the
// main thread. Subagent B replaces this body with the real model load.

import type { EmbedderMessage } from '@/features/retrieval/embed';

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', (event: MessageEvent<EmbedderMessage>) => {
  if (event.data.type === 'embed') {
    // Placeholder: echo back zero vectors so callers can wire UI without
    // a real model. Subagent B replaces with `transformers.pipeline`.
    const fake = event.data.texts.map(() => new Float32Array(384));
    const reply: EmbedderMessage = {
      type: 'embed-result',
      id: event.data.id,
      embeddings: fake,
    };
    self.postMessage(reply);
  }
});

// Keep TS happy that this file is treated as a module.
export {};
