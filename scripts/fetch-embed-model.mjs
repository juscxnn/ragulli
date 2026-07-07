// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// fetch-embed-model.mjs — Download the self-hosted embedding model at
// BUILD time so the deployed site serves it from its own origin. The
// embed worker sets `env.allowRemoteModels = false` and
// `env.localModelPath = '/models'`, so at runtime Transformers.js
// requests /models/Xenova/all-MiniLM-L6-v2/... from same-origin —
// no huggingface.co traffic from the user's browser, ever.
//
// Model choice: Xenova/all-MiniLM-L6-v2 (384-dim, q8-quantized ONNX,
// ~23 MB). Cloudflare Pages rejects any single file over 25 MiB, so
// the larger bge-small q8 (~34 MB) cannot be self-hosted; MiniLM can.
// Pure Node; global fetch + node:fs only, no npm deps.

import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const BASE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
const OUT = resolve(__dirname, '..', 'public', 'models', MODEL_ID);

// Cloudflare Pages per-file limit. The build must fail loudly if the
// ONNX file ever crosses it — a silent overshoot would deploy a site
// with a missing model and a dead ingest pipeline.
const CLOUDFLARE_MAX_FILE_BYTES = 26_214_400; // 25 MiB

// Everything Transformers.js requests when loading the
// feature-extraction pipeline with { dtype: 'q8' }. `minBytes` is a
// plausibility floor: an existing file smaller than this (e.g. an
// HTML error page saved by an interrupted run) is re-downloaded.
const MODEL_FILES = [
  { path: 'config.json', minBytes: 200 },
  { path: 'tokenizer.json', minBytes: 100_000 },
  { path: 'tokenizer_config.json', minBytes: 100 },
  { path: 'special_tokens_map.json', minBytes: 100 },
  { path: 'onnx/model_quantized.onnx', minBytes: 10_000_000 },
];

// The ONNX Runtime WASM backend. Transformers.js loads these from
// cdn.jsdelivr.net by default, which the CSP blocks (and which would
// break the trust story). They ship inside the installed
// @huggingface/transformers package, so we STAGE them from
// node_modules (version-locked, no network) into /models/ort/ and
// point `env.backends.onnx.wasm.wasmPaths` there in the embed worker.
const ORT_SRC = resolve(__dirname, '..', 'node_modules', '@huggingface', 'transformers', 'dist');
const ORT_OUT = resolve(__dirname, '..', 'public', 'models', 'ort');
const ORT_FILES = [
  { path: 'ort-wasm-simd-threaded.jsep.mjs', minBytes: 20_000 },
  { path: 'ort-wasm-simd-threaded.jsep.wasm', minBytes: 10_000_000 },
];

async function fileSize(path) {
  try {
    const stat = await fs.stat(path);
    return stat.isFile() ? stat.size : -1;
  } catch {
    return -1;
  }
}

async function download(relPath) {
  const url = new URL(relPath, BASE_URL);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const dest = resolve(OUT, relPath);
  await fs.mkdir(dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  return bytes.length;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  for (const { path, minBytes } of MODEL_FILES) {
    const dest = resolve(OUT, path);
    const existing = await fileSize(dest);
    if (existing >= minBytes) {
      console.log(`[fetch-embed-model] keep  ${path} (${existing} bytes, already present)`);
      continue;
    }
    console.log(`[fetch-embed-model] fetch ${path} ...`);
    const size = await download(path);
    if (size < minBytes) {
      throw new Error(
        `Downloaded ${path} is ${size} bytes, below the plausibility floor of ${minBytes}. ` +
          `The upstream file may have moved; refusing to build with a broken model.`,
      );
    }
    console.log(`[fetch-embed-model] wrote ${path} (${size} bytes)`);
  }

  // Stage the ONNX Runtime WASM backend from node_modules.
  await fs.mkdir(ORT_OUT, { recursive: true });
  for (const { path, minBytes } of ORT_FILES) {
    const src = resolve(ORT_SRC, path);
    const dest = resolve(ORT_OUT, path);
    const srcSize = await fileSize(src);
    if (srcSize < minBytes) {
      throw new Error(
        `${path} in node_modules is ${srcSize} bytes (expected >= ${minBytes}). ` +
          `Run pnpm install, or the @huggingface/transformers layout changed.`,
      );
    }
    if ((await fileSize(dest)) === srcSize) {
      console.log(`[fetch-embed-model] keep  ort/${path} (${srcSize} bytes, already staged)`);
      continue;
    }
    await fs.copyFile(src, dest);
    console.log(`[fetch-embed-model] stage ort/${path} (${srcSize} bytes, from node_modules)`);
  }

  // Hard gate: Cloudflare Pages silently rejects deploys with files
  // over 25 MiB. Fail the build here instead.
  for (const rel of [
    resolve(OUT, 'onnx/model_quantized.onnx'),
    resolve(ORT_OUT, 'ort-wasm-simd-threaded.jsep.wasm'),
  ]) {
    const size = await fileSize(rel);
    if (size > CLOUDFLARE_MAX_FILE_BYTES) {
      throw new Error(
        `${rel} is ${size} bytes, over the Cloudflare Pages per-file limit of ` +
          `${CLOUDFLARE_MAX_FILE_BYTES} bytes (25 MiB). Do not deploy.`,
      );
    }
  }
  console.log('[fetch-embed-model] ok — all model files under the 25 MiB Cloudflare limit.');
}

main().catch((err) => {
  console.error('[fetch-embed-model] FAILED:', err.message ?? err);
  process.exit(1);
});
