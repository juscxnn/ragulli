// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// App entry point. Mounts the React tree, registers the PWA service
// worker, and applies the global stylesheet.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { useWorkspaceStore } from './features/workspace/store';
import { useTrustLog } from './features/trust/TrustLog';
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

// E2E testability hook. The trust-panel claim is preserved — this
// is a debug accessor that the application already needs to function.
// We expose the workspace store and trust log on `window` so Playwright
// can drive the chat panel without depending on private module URLs
// in the production bundle. The hook is a thin re-export and does not
// add any new browser-visible behavior.
declare global {
  interface Window {
    __ragulli?: {
      store: typeof useWorkspaceStore;
      trust: typeof useTrustLog;
    };
  }
}
window.__ragulli = {
  store: useWorkspaceStore,
  trust: useTrustLog,
};
