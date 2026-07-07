// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Vite configuration for the RAGülli app entry point.
//
// CSP CONNECT-SRC ENDPOINTS — every URL below is allow-listed in public/_headers.
// Adding a new endpoint here without an entry in _headers is a trust-panel violation.
//   - api.openai.com                  : BYOK direct call (OpenAI / GPT)
//   - api.anthropic.com               : not used directly; routed via ragulli-proxy (see below)
//   - generativelanguage.googleapis.com : BYOK direct call (Google / Gemini)
//   - api.minimaxi.chat                : BYOK direct call (MiniMax / M2)
//   - api.moonshot.cn                 : BYOK direct call (Moonshot / Kimi)
//   - ragulli-proxy.vercel.app        : stateless Vercel Edge function for Anthropic CORS only
// Hugging Face model downloads (transformers.js) load WASM/cache from 'self' and the
// model is fetched once from huggingface.co under the user's explicit click. That
// entry is intentionally NOT in connect-src; downloads happen via the user opening
// the model in a new tab. (Documented here per spec §4.5.)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
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
        "font-src 'self'",
        "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.minimaxi.chat https://api.moonshot.cn https://ragulli-proxy.vercel.app",
        "worker-src 'self' blob:",
      ].join('; '),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
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
