// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Activity record type for the trust log. Re-exported from llm/types
// because the LLM feature owns the canonical record shape; the trust
// panel is a view on top of it.

export type { TrustActivity } from '@/features/llm/types';
