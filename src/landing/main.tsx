// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing entry. Reads window.location.pathname and renders the matching
// page from src/landing/pages/. The same bundle is loaded by every
// landing HTML entry (index, /t/{id}, /compare/{id}, /privacy); Vite's
// Rollup chunker keeps the entry chunk shared across all of them.
//
// Route table:
//   /                         -> Home
//   /t/{template-id}          -> TemplatePage
//   /compare/{competitor-id}  -> ComparePage
//   /privacy                  -> PrivacyPage
// Anything else falls back to Home.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingApp } from './App';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <LandingApp />
  </StrictMode>,
);