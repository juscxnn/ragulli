// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Four-second rule E2E test. The dropzone must become interactive
// in under 4 seconds from `page.goto('/app/')`. We measure from
// the navigation start to the moment the canvas dropzone renders
// its interactive text.

import { expect, test } from '@playwright/test';

test('dropzone is interactive in under 4 seconds (four-second rule)', async ({ page }) => {
  test.setTimeout(30_000);
  const start = Date.now();
  await page.goto('/app/');

  // Wait for the canvas's empty-state dropzone to render.
  await expect(page.getByText('Drop a file to ingest')).toBeVisible({ timeout: 8_000 });

  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(4_000);
});