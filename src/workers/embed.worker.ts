// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Embedding Web Worker. We run Transformers.js off the main thread so
// the model download + inference never blocks the UI. The worker is
// lazily initialized on the first request and the pipeline is held in
// module scope so subsequent calls reuse the same instance.

import { env, pipeline, type FeatureExtractionPipeline, type Tensor } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/bge-small-en-v1.5';

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest = {
  type: 'embed';
  id: string;
  chunks: string[];
};

type WorkerResponse =
  | { type: 'embed:result'; id: string; embeddings: number[][] }
  | { type: 'embed:error'; id: string; message: string };

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function loadPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    // Allow the model to be cached to OPFS so subsequent loads are
    // offline. We do not change `allowRemoteModels` — the user must
    // trigger the first load by opening the app, at which point the
    // trust panel can show "downloading model" in plain English.
    env.useFsCache = true;
    pipelinePromise = pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8',
    });
  }
  return pipelinePromise;
}

function tensorToMatrix(tensor: Tensor): number[][] {
  const dims = tensor.dims;
  if (dims.length !== 2) {
    throw new Error(`Expected a 2-D [N, D] tensor from the embedder, got dims [${dims.join(',')}]`);
  }
  const n = dims[0] ?? 0;
  const d = dims[1] ?? 0;
  const data = tensor.data;
  const out: number[][] = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const row = new Array<number>(d);
    const base = i * d;
    for (let j = 0; j < d; j += 1) {
      row[j] = data[base + j] as number;
    }
    out[i] = row;
  }
  return out;
}

async function handleEmbed(req: WorkerRequest): Promise<WorkerResponse> {
  if (req.type !== 'embed') {
    return { type: 'embed:error', id: (req as WorkerRequest).id, message: 'Unknown request type' };
  }
  try {
    const pl = await loadPipeline();
    const tensor = await pl(req.chunks, { pooling: 'mean', normalize: true });
    return { type: 'embed:result', id: req.id, embeddings: tensorToMatrix(tensor) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { type: 'embed:error', id: req.id, message };
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || req.type !== 'embed') return;
  handleEmbed(req).then((res) => {
    self.postMessage(res);
  });
});

// Keep TS happy that this file is treated as a module.
export {};
