// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// In-browser LLM fallback provider. Uses `@mlc-ai/web-llm` to load a
// quantized model into WebGPU and stream tokens from its callback.
// We default to Phi-3.5-mini (q4f16) per spec §4.4 — the smallest
// model that still produces usable answers.
//
// The first activation downloads ~2 GB and may take 30+ seconds. We
// emit token-shaped progress chunks while the model is loading so
// the chat panel can show "loading model… 42%". Once cached, the
// model loads from the service-worker cache in seconds.
//
// The apiKey field is ignored for WebLLM (no network call) but kept
// in the StreamOptions interface so the provider shape is uniform.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions } from '../types';
import {
  DEFAULT_WEBLLM_MODEL,
  getWebLLMEngine,
  listWebLLMModels,
  type RagulliWebLLMEngine,
} from './webllm-engine';

export async function* stream(
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncIterable<StreamChunk> {
  opts.onTrust?.({
    id: randomId(),
    ts: Date.now(),
    kind: 'model-call',
    summary: `Running model in browser · ${opts.model}`,
    destination: 'this browser tab (WebLLM)',
  });

  // Throttle progress emission so we don't flood the chat panel.
  let lastProgressEmit = 0;
  let lastProgressPct = -1;

  let engine: RagulliWebLLMEngine;
  try {
    engine = await getWebLLMEngine(opts.model, (report) => {
      const now = Date.now();
      // Emit at most once per ~250 ms or whenever the integer percent
      // jumps, whichever comes first.
      const pct = Math.round(report.progress * 100);
      if (now - lastProgressEmit < 250 && pct === lastProgressPct) return;
      lastProgressEmit = now;
      lastProgressPct = pct;
      // We can't `yield` here because we're not inside the
      // generator yet. The progress is captured into a local
      // buffer and surfaced as the first token chunk after load
      // completes; see below.
      pendingProgress.push({ report, pct });
    });
  } catch (err) {
    yield { type: 'error', message: `WebLLM load failed: ${errMessage(err)}` };
    return;
  }

  // Flush captured progress as a single token-shaped chunk.
  if (pendingProgress.length > 0) {
    const last = pendingProgress[pendingProgress.length - 1];
    if (last) {
      yield {
        type: 'token',
        text: '',
        meta: { status: 'loading', progress: last.pct / 100, label: last.report.text },
      };
    }
    pendingProgress.length = 0;
  }

  const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
    messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

  try {
    // The WebLLM chat completion stream yields OpenAI-shaped chunks.
    const stream = await engine.engine.chat.completions.create({
      stream: true,
      messages: llmMessages,
      temperature: 0.2,
    });
    for await (const chunk of stream) {
      if (opts.signal?.aborted) {
        engine.engine.interruptGenerate();
        return;
      }
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) yield { type: 'token', text: content };
    }
  } catch (err) {
    yield { type: 'error', message: `WebLLM generation failed: ${errMessage(err)}` };
    return;
  }

  yield { type: 'done', meta: { provider: 'webllm', model: opts.model } };
}

interface PendingProgress {
  report: { progress: number; timeElapsed: number; text: string };
  pct: number;
}

const pendingProgress: PendingProgress[] = [];

/** Public helpers used by the provider registry and the Settings UI. */
export const DEFAULT_MODEL = DEFAULT_WEBLLM_MODEL;
export const AVAILABLE_MODELS = listWebLLMModels();

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `act-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
