// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Single root route. Spec §4.1: "Router — None needed (single-page app)."
// App-level routing concerns (deep-link query params, settings dialog,
// source viewer) live in `src/App.tsx`. This file remains as the
// canonical place to mount a future client-side router.

import type { FC } from 'react';

export const RootRoute: FC = () => null;

export default RootRoute;