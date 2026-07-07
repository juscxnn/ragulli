// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// WebLLM engine wrapper. The `@mlc-ai/web-llm` import is lazy and
// happens only when `getWebLLMEngine` is actually called. Tests
// `vi.mock` this entire module to avoid loading WebGPU.

import type { InitProgressReport } from '@mlc-ai/web-llm';

// Minimal engine surface we use. Cast at the boundary so the test
// stubs do not need to provide the full MLCEngineInterface (which is
// 100+ methods we never call).
export interface RagulliWebLLMEngine {
  engine: {
    chat: {
      completions: {
        create: (req: {
          stream: boolean;
          messages: Array<{ role: string; content: string }>;
          temperature?: number;
        }) => Promise<AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>>;
      };
    };
    interruptGenerate: () => void;
    reload?: (modelId: string) => Promise<void>;
  };
}

type ProgressFn = (report: InitProgressReport) => void;

let cached: { modelId: string; engine: RagulliWebLLMEngine } | null = null;

/**
 * Default model per spec §4.4 — Phi-3.5-mini in 4-bit f16 mix.
 * Smallest variant that still produces usable answers; first download
 * is ~2 GB but caches locally for subsequent loads.
 */
export const DEFAULT_WEBLLM_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

/**
 * Models offered in the Settings picker. Subset of prebuiltAppConfig.
 * We expose only the small variants so V1 never accidentally fills
 * a small device.
 */
export const WEBLLM_MODELS: readonly string[] = [
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
  'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Llama-3.1-8B-Instruct-q4f16_1-MLC',
  'Qwen2.5-3B-Instruct-q4f16_1-MLC',
];

export function listWebLLMModels(): readonly string[] {
  return WEBLLM_MODELS;
}

/**
 * Acquire a loaded engine. The first call for a given `modelId`
 * downloads the weights and warms the GPU; subsequent calls reuse
 * the cache. Calling with a different model reloads the engine.
 */
export async function getWebLLMEngine(
  modelId: string,
  onProgress: ProgressFn,
): Promise<RagulliWebLLMEngine> {
  if (cached && cached.modelId === modelId) return cached.engine;

  const mod = await import('@mlc-ai/web-llm');
  const nativeEngine = await mod.CreateMLCEngine(modelId, {
    initProgressCallback: (r) => onProgress(r as InitProgressReport),
  });

  const engine = nativeEngine as unknown as RagulliWebLLMEngine;
  cached = { modelId, engine };
  return engine;
}

/** Test-only helper — clears the cache. */
export function _resetWebLLMEngineForTests(): void {
  cached = null;
}
