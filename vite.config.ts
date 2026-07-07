// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Vite configuration for the RAGülli project.
//
// The build produces TWO static sites from one Vite invocation:
//   - Landing site at /, /t/{id}, /compare/{id}, /privacy
//     (driven by src/landing/main.tsx — the marketing bundle)
//   - The application at /app/*
//     (driven by src/main.tsx — the SPA bundle with the PWA shell)
//
// Multi-page entry is declared via rollupOptions.input. Each HTML file
// is its own Rollup input; code shared between entries is hoisted into
// shared chunks by Rollup's default chunking strategy. The landing
// bundle deliberately imports NONE of the app's heavy deps
// (pdfjs-dist, mammoth, @mozilla/readability, @mlc-ai/web-llm,
// dexie, @huggingface/transformers, native-file-system-adapter) so
// the marketing bundle stays tiny and the trust-panel claim about not
// contacting third-party origins for files holds.
//
// CSP CONNECT-SRC ENDPOINTS — every URL below is allow-listed in
// public/_headers. Adding a new endpoint here without an entry in
// _headers is a trust-panel violation.
//   - api.openai.com                  : BYOK direct call (OpenAI / GPT)
//   - api.anthropic.com               : not used directly; routed via ragulli-proxy (see below)
//   - generativelanguage.googleapis.com : BYOK direct call (Google / Gemini)
//   - api.minimaxi.chat                : BYOK direct call (MiniMax / M2)
//   - api.moonshot.cn                 : BYOK direct call (Moonshot / Kimi)
//   - ragulli-proxy.vercel.app        : stateless Vercel Edge function for Anthropic CORS only
// Hugging Face model downloads (transformers.js) load WASM/cache from
// 'self' and the model is fetched once from huggingface.co under the
// user's explicit click. That entry is intentionally NOT in
// connect-src; downloads happen via the user opening the model in a
// new tab. (Documented here per spec §4.5.)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = (p: string) => path.resolve(__dirname, p);

const PER_TEMPLATE_ROUTES = [
  't/research-paper-reader',
  't/contract-reviewer',
  't/customer-interview-corpus',
  't/book-companion',
  't/newsletter-digester',
  't/job-application-matcher',
] as const;

const PER_COMPARE_ROUTES = [
  'compare/notebooklm',
  'compare/humata',
  'compare/chatpdf',
] as const;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The PWA plugin only applies to HTML entries that opt in. We
      // apply it to the app entry only; landing entries ignore the
      // SW registration call because main.tsx does not call registerSW.
      includeAssets: ['favicon.svg', 'favicon.ico', 'logo-mark.svg', 'logo-full.svg', 'og-image.png'],
      manifest: {
        name: 'RAGülli',
        short_name: 'RAGülli',
        description: 'Your files. Your AI. Your browser.',
        theme_color: '#0B2027',
        background_color: '#0B2027',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo-mark.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo-mark-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff,woff2}'],
        // The webllm chunk is ~6 MB (WebLLM is a model-loader library, not a
        // model itself; this is the runtime code only — model weights are
        // downloaded separately). The default 2 MiB precache cap silently
        // excludes it; bump the cap so the in-browser provider is
        // available offline. Cap is 16 MiB to leave headroom for future
        // heavy chunks.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        navigateFallback: '/app/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/t\//, /^\/compare\//, /^\/privacy/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/sample-files/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ragulli-sample-files',
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      // The production CSP lives in public/_headers for Cloudflare Pages. The
      // dev/preview server uses this mirror so we can verify the header locally.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.minimaxi.chat https://api.moonshot.cn https://ragulli-proxy.vercel.app",
        "worker-src 'self' blob:",
      ].join('; '),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        // Landing entries. Each is a static HTML file that loads the
        // shared landing bundle (/src/landing/main.tsx). Rollup hoists
        // the shared bundle into a single chunk; per-page JS files
        // become tiny entry shims.
        main: r('index.html'),
        ...Object.fromEntries(PER_TEMPLATE_ROUTES.map((p) => [p, r(`${p}.html`)])),
        ...Object.fromEntries(PER_COMPARE_ROUTES.map((p) => [p, r(`${p}.html`)])),
        privacy: r('privacy.html'),
        // App entry — the SPA. Lives at /app/ in the final dist.
        app: r('app/index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // The app entry lives under /app/assets in dist so the SPA
          // HTML references it correctly.
          if (chunkInfo.name === 'app') return 'app/assets/[name]-[hash].js';
          // Landing per-route entries produce tiny shims; keep them at
          // the root with a hashed name so they cache aggressively.
          if (chunkInfo.name === 'main') return 'assets/[name]-[hash].js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          pdf: ['pdfjs-dist'],
          docx: ['mammoth'],
          readability: ['@mozilla/readability'],
          webllm: ['@mlc-ai/web-llm'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});