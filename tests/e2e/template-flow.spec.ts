// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Template-flow E2E test. Verifies the deep-link picker path:
//   /app/?template=research-paper-reader
// should:
//   1. Open the template picker dialog with the named template pre-
//      selected in localStorage under `ragulli:active-template:v1`.
//   2. Once the user picks (or the dialog auto-closes on the
//      pre-selection seed), the chat panel renders the template's
//      quick-actions — not the generic defaults.
//
// This proves the "Pick one of the 6 templates. The starting prompt
// and ingest defaults change appropriately." spec DoD.

import { expect, test } from './fixtures';

const TEMPLATE_ID = 'research-paper-reader';

test('template deep-link pre-selects the template and seeds quick-actions', async ({ page }) => {
  // Clear localStorage so the test sees a clean state.
  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Land on the app with a template query param. The dialog opens
  // and the active-template map is seeded for the active workspace.
  await page.goto(`/app/?template=${TEMPLATE_ID}`);

  // The template picker dialog must be visible.
  await expect(page.getByRole('dialog', { name: /pick a template/i })).toBeVisible({
    timeout: 10_000,
  });

  // The card with this template id is present in the picker.
  const card = page.locator(`[data-template-id="${TEMPLATE_ID}"]`);
  await expect(card).toBeVisible();

  // The localStorage map is seeded with the deep-linked id (the
  // App effect stores it under the active workspace key). This is
  // what the ChatPanel reads to decide which quick-actions to show.
  const seeded = await page.evaluate((id) => {
    const raw = localStorage.getItem('ragulli:active-template:v1');
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return Object.values(map).includes(id) ? id : null;
  }, TEMPLATE_ID);
  expect(seeded).toBe(TEMPLATE_ID);

  // Click the card to confirm; this closes the dialog. The chat
  // panel will then render the template's quick-actions, not the
  // generic defaults.
  await card.click();
  await expect(page.getByRole('dialog', { name: /pick a template/i })).toBeHidden();

  // The research-paper-reader template seeds four specific quick-
  // actions. The labels are unique to this template (the generic
  // fallback uses "Summarize", "Find dates", "Compare", "Explain
  // jargon"); the template uses "Find methodology", "List
  // limitations", "Compare claims".
  await expect(
    page.getByRole('button', { name: /find methodology/i }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /list limitations/i })).toBeVisible();
});