// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Embedding Web Worker. We run Transformers.js off the main thread so
// the model download + inference never blocks the UI. The worker is
// lazily initialized on the first request and the pipeline is held in
// module scope so subsequent calls reuse the same instance.

import { env, pipeline, type FeatureExtractionPipeline, type Tensor } from '@huggingface/transformers';

// The embedding model is SELF-HOSTED: scripts/fetch-embed-model.mjs
// downloads it at build time into public/models/, so at runtime the
// browser only ever fetches /models/Xenova/all-MiniLM-L6-v2/... from
// our own origin. This keeps the CSP connect-src free of any
// third-party origin for the core product. MiniLM emits 384-dim
// vectors — the same dimensionality as the previous bge-small model,
// so the Dexie schema is unchanged.
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

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
    // Load exclusively from our own origin. `allowRemoteModels =
    // false` makes Transformers.js refuse to contact huggingface.co;
    // combined with `localModelPath = '/models'` every model request
    // becomes a same-origin fetch of /models/<MODEL_ID>/..., which is
    // covered by connect-src 'self' and cached offline by the service
    // worker's 'ragulli-embed-model' runtime cache. `allowLocalModels`
    // defaults to FALSE in browser/worker builds of Transformers.js,
    // so it must be set explicitly or loading fails with "both local
    // and remote models are disabled".
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = '/models';
    env.useFSCache = true;
    // The ONNX Runtime WASM backend would otherwise load from
    // cdn.jsdelivr.net (CSP-blocked, and a third-party origin the
    // trust panel never mentions). The build stages the two runtime
    // files from node_modules into /models/ort/ — same origin, same
    // runtime cache as the model itself.
    if (env.backends.onnx?.wasm) {
      env.backends.onnx.wasm.wasmPaths = '/models/ort/';
    }
    const p = (pipeline as unknown as (
      task: string,
      model: string,
      opts?: Record<string, unknown>,
    ) => Promise<FeatureExtractionPipeline>)('feature-extraction', MODEL_ID, { dtype: 'q8' });
    pipelinePromise = p;
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
