// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// PostCSS config for Tailwind v4. The @tailwindcss/vite plugin handles the
// build pipeline in vite.config.ts; this file is kept for tooling that
// expects postcss.config.js (e.g. IDE Prettier/ESLint integrations).

export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
