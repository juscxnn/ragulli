// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Shared Playwright fixtures. The default `page` is extended to skip
// the first-run onboarding overlay: that modal intercepts pointer
// events and would block every UI interaction in a fresh-state test.
// The init script runs on every document load (including reloads), so
// it also covers specs that clear localStorage and reload.

import { test as base, expect } from '@playwright/test';

export type { Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ragulli:onboarded:v1', '1');
      } catch {
        /* storage may be unavailable in some sandboxes */
      }
    });
    await use(page);
  },
});

export { expect };
