// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Vercel Edge function: stateless Anthropic CORS proxy.
// =================================================================
//
// DESIGN RATIONALE (verbatim from spec §4.6)
// -----------------------------------------------------------------
// "Vercel Edge function at api/anthropic.ts that takes
//  { messages, apiKey } (passed in the body, NOT stored), forwards
//  to Anthropic, streams back. The function:
//   - Does NOT log anything.
//   - Does NOT persist anything.
//   - Returns the stream directly.
//   - Vercel function logs are turned off (or wiped every 24 hours).
//
//  This counts as a 'BE' in the deployment sense but does NOT
//  violate the user-facing browser-only promise, because:
//   - The user's files never go to it.
//   - Only the user's question + user-supplied key go to it.
//   - The Edge function is stateless and call-time-only."
//
// IMPLEMENTATION RULES (enforced by the test in
// tests/unit/anthropic-edge.test.ts)
// -----------------------------------------------------------------
//   1. Never call console.* with anything that includes the body,
//      headers, or query string. A single console.warn with a
//      non-content error message is allowed for Vercel runtime
//      debugging only — but this implementation avoids it entirely
//      because Vercel function logs are turned off per spec.
//   2. Do not read or write any browser storage API
//      (localStorage, sessionStorage, IndexedDB, cookies).
//   3. Pass through only `content-type` from Anthropic's response.
//      Strip every other header — Anthropic returns several that
//      have no use to the browser and could leak timing data.
//   4. Pipe the SSE stream straight through with `pipe`.
//   5. Reject non-POST requests with 405.
//   6. Validate the body has `messages`, `apiKey`, and `model`;
//      otherwise return 400 with a static, fixed message.
//
// The function is the only server-side component in V1 and is
// intentional minimalism.

export const config = {
  runtime: 'edge',
};

interface ProxyRequest {
  model: string;
  apiKey: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  max_tokens?: number;
  stream?: true;
}

interface ProxyErrorBody {
  error: { type: string; message: string };
}

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MAX_TOKENS = 4096;

function isProxyRequest(value: unknown): value is ProxyRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.model !== 'string' || v.model.length === 0) return false;
  if (typeof v.apiKey !== 'string' || v.apiKey.length === 0) return false;
  if (!Array.isArray(v.messages) || v.messages.length === 0) return false;
  for (const m of v.messages) {
    if (!m || typeof m !== 'object') return false;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') return false;
    if (typeof content !== 'string') return false;
  }
  return true;
}

function jsonError(status: number, type: string, message: string): Response {
  const body: ProxyErrorBody = { error: { type, message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  // 1. Method check.
  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'POST required');
  }

  // 2. Parse body. We never persist it. We never log it.
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Request body is not JSON');
  }
  if (!isProxyRequest(parsed)) {
    return jsonError(400, 'invalid_request', 'Missing fields in request body');
  }

  // 3. Build the Anthropic request body. We drop `apiKey` (it lives
  //    only as a header) and add `stream: true` so Anthropic emits
  //    SSE. max_tokens is required by Anthropic; we default to 4096
  //    if the caller did not specify.
  const anthropicBody: Record<string, unknown> = {
    model: parsed.model,
    messages: parsed.messages,
    max_tokens: parsed.max_tokens ?? DEFAULT_MAX_TOKENS,
    stream: true,
  };
  if (parsed.system) {
    anthropicBody.system = parsed.system;
  }

  // 4. POST to Anthropic. We pass the apiKey in the `x-api-key`
  //    header and add the required `anthropic-version` header.
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': parsed.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch {
    // Network unreachable or DNS failure. We do not log the cause
    // because it might contain the host we're calling.
    return jsonError(502, 'upstream_unreachable', 'Anthropic unreachable');
  }

  // 5. Forward the body. Strip every header except content-type
  //    so we do not leak timing data or Anthropic's internal ids.
  if (!upstream.body) {
    return jsonError(502, 'upstream_no_body', 'Anthropic returned no body');
  }
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // 6. Pass through status; on non-OK, wrap the body as a JSON
  //    error so the browser can show a clean message. We do not
  //    attempt to parse Anthropic's error shape — we pass it
  //    through opaque text inside a JSON envelope.
  if (!upstream.ok) {
    let text = '';
    try {
      text = await upstream.text();
    } catch {
      /* swallow */
    }
    const body: ProxyErrorBody = {
      error: {
        type: 'upstream_error',
        message: text ? text.slice(0, 400) : `Anthropic returned ${upstream.status}`,
      },
    };
    return new Response(JSON.stringify(body), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(upstream.body, { status: 200, headers });
}
