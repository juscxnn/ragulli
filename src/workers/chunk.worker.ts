// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Chunking Web Worker. Reserved for heavy text preprocessing; the
// current chunker is cheap enough to run on the main thread. Subagent B
// decides whether to move it here.

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', () => {
  // No-op placeholder.
});

export {};
