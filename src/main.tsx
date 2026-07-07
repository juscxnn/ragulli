// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// App entry point. Mounts the React tree, registers the PWA service
// worker, and applies the global stylesheet.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Auto-update the service worker. Subagent F may swap this for a manual
// "Reload to update" toast once we have a release cadence.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
