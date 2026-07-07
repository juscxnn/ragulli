// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Unified chat-stream interface. `streamChat` dispatches a `ChatRequest`
// to the right provider module based on `req.provider`. Providers
// live in `./providers/<id>.ts` and are registered statically in
// `provider-registry.ts`. We never dynamic-import; the chunk graph
// is predictable so Vite can split webllm into its own chunk
// (configured in `vite.config.ts`).
//
// Errors at the dispatch level (unknown provider, missing apiKey
// for a key-required provider) are reported as `error` chunks
// rather than thrown exceptions, so the chat UI never has to
// defend against a thrown promise.

import type { ChatRequest, StreamChunk } from './types';
import { getActiveProvider, getProvider } from './provider-registry';

export async function* streamChat(
  req: ChatRequest | Omit<ChatRequest, 'provider'>,
): AsyncIterable<StreamChunk> {
  const provider = 'provider' in req ? req.provider : getActiveProvider();
  const descriptor = getProvider(provider);

  if (descriptor.needsKey && (!('apiKey' in req) || !req.apiKey)) {
    yield {
      type: 'error',
      message: `Missing API key for ${descriptor.label}. Open Settings to add one.`,
    };
    return;
  }

  const opts = {
    apiKey: ('apiKey' in req && req.apiKey) || '',
    model: req.model,
    signal: req.signal,
    onTrust: req.onTrust,
  };

  yield* descriptor.stream(req.messages, opts);
}
