// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tailwind v4 reads design tokens from src/styles/globals.css via @theme.
// This file is intentionally minimal: only content globs. No theme config here.

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
};

export default config;
