// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Guardrail tests for the self-hosted embedding model. The launch
// blocker these protect against: the embed worker silently reaching
// out to huggingface.co (blocked by the production CSP) instead of
// loading the model from our own origin. We assert on the SOURCE TEXT
// of the worker and the build script because the actual model load
// only happens in a real browser worker, which vitest cannot spawn.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

describe('self-hosted embedding model', () => {
  const workerSrc = read('src/workers/embed.worker.ts');
  const scriptSrc = read('scripts/fetch-embed-model.mjs');

  it('embed worker refuses remote models and loads from /models', () => {
    // allowLocalModels defaults to FALSE in browser/worker builds;
    // without the explicit flip, loading fails with "both local and
    // remote models are disabled".
    expect(workerSrc).toContain('env.allowLocalModels = true');
    expect(workerSrc).toContain('env.allowRemoteModels = false');
    expect(workerSrc).toContain("env.localModelPath = '/models'");
    expect(workerSrc).toContain("const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'");
    // 'q8' maps to onnx/model_quantized.onnx — the file the build
    // script fetches. If the dtype changes, the script must too.
    expect(workerSrc).toContain("dtype: 'q8'");
    // ONNX Runtime's WASM backend defaults to cdn.jsdelivr.net —
    // CSP-blocked and off-origin. It must point at the staged copy.
    expect(workerSrc).toContain("env.backends.onnx.wasm.wasmPaths = '/models/ort/'");
  });

  it('build script stages the ONNX runtime from node_modules', () => {
    expect(scriptSrc).toContain('ort-wasm-simd-threaded.jsep.mjs');
    expect(scriptSrc).toContain('ort-wasm-simd-threaded.jsep.wasm');
  });

  it("CSP script-src allows WASM compilation but not JS eval", () => {
    const headers = read('public/_headers');
    const viteConfig = read('vite.config.ts');
    for (const src of [headers, viteConfig]) {
      expect(src).toContain("script-src 'self' 'wasm-unsafe-eval'");
      expect(src).not.toContain("'unsafe-eval'");
    }
  });

  it('chunker tokenizer is the same self-hosted model, same-origin only', () => {
    const chunkerSrc = read('src/features/ingest/chunker.ts');
    expect(chunkerSrc).toContain("const TOKENIZER_NAME = 'Xenova/all-MiniLM-L6-v2'");
    expect(chunkerSrc).toContain('env.allowLocalModels = true');
    expect(chunkerSrc).toContain('env.allowRemoteModels = false');
    expect(chunkerSrc).toContain("env.localModelPath = '/models'");
  });

  it('fetch script targets exactly the files transformers.js requests', () => {
    // Model id must match the worker's.
    expect(scriptSrc).toContain("'Xenova/all-MiniLM-L6-v2'");
    // The five files a q8 feature-extraction pipeline loads.
    for (const file of [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'special_tokens_map.json',
      'onnx/model_quantized.onnx',
    ]) {
      expect(scriptSrc).toContain(`'${file}'`);
    }
    // The Cloudflare Pages 25 MiB per-file gate must stay in place.
    expect(scriptSrc).toContain('26_214_400');
  });

  it('build runs the fetch script before the app build', () => {
    const pkg = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['build:assets']).toContain('fetch-embed-model.mjs');
    expect(pkg.scripts['fetch:model']).toBe('node scripts/fetch-embed-model.mjs');
  });
});

describe('CSP connect-src', () => {
  const headers = read('public/_headers');
  const viteConfig = read('vite.config.ts');

  // Pull the connect-src directive out of a full CSP string.
  const connectSrcOf = (csp: string): string => {
    const match = /connect-src ([^;]+)/.exec(csp);
    if (!match?.[1]) throw new Error('No connect-src directive found');
    return match[1].trim();
  };

  const headerLine = headers
    .split('\n')
    .find((l) => l.trimStart().startsWith('Content-Security-Policy:'));

  it('production _headers allows the WebLLM model origins', () => {
    expect(headerLine).toBeDefined();
    const connect = connectSrcOf(headerLine as string);
    for (const origin of [
      'https://huggingface.co',
      'https://*.huggingface.co',
      'https://*.hf.co',
      'https://raw.githubusercontent.com',
    ]) {
      expect(connect).toContain(origin);
    }
    // The self-hosted embed model rides on 'self'.
    expect(connect).toContain("'self'");
  });

  it('preview CSP in vite.config.ts mirrors production connect-src', () => {
    const previewMatch = /"connect-src ([^"]+)"/.exec(viteConfig);
    expect(previewMatch?.[1]).toBeDefined();
    const previewOrigins = (previewMatch as RegExpExecArray)[1]?.trim().split(/\s+/).sort();
    const prodOrigins = connectSrcOf(headerLine as string).split(/\s+/).sort();
    expect(previewOrigins).toEqual(prodOrigins);
  });
});
