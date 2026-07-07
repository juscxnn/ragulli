// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ChatPanel — the right rail. Owns the question input, the streaming
// chat, and the citation click→source-viewer navigation. Implements
// spec Scenes 3 and 4:
//   - Empty state: "Drop a file to start" + 4 quick-action chips
//   - Streaming: pull top-K chunks from `topK`, build a context-
//     block prompt, call `streamChat`, segment the final answer via
//     `buildCitations` + `segmentForRender`, render segments with
//     CitationSpan for clickable spans.
//   - Sources-used footer under each assistant message.

import { useCallback, useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../store';
import { topK, type SearchResult } from '@/features/retrieval/search';
import type { ChatMessage, TrustActivity } from '@/features/retrieval/types';
import {
  buildCitations,
  segmentForRender,
  getActiveProvider,
  hasKey,
  getKey,
} from '@/features/llm';
import type { BuiltCitation, CitationMode, ProviderId, StreamChunk } from '@/features/llm';
import { Message } from './Message';
import { QuickActions, type QuickAction } from './QuickActions';
import { useTrustLog } from '@/features/trust/TrustLog';
import { Button } from '@/components/ui/Button';
import { TEMPLATES } from '@/features/templates/templates';

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Summarize', prompt: 'Summarize this corpus in 5 bullets, citing sources.' },
  { label: 'Find dates', prompt: 'List every date mentioned across these sources.' },
  { label: 'Compare', prompt: 'Compare the claims in the first source to the second.' },
  { label: 'Explain jargon', prompt: 'Define every term a non-expert would not know.' },
];

const CITATION_MODE: CitationMode = 'inline';

export const ChatPanel: FC = () => {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const sources = useWorkspaceStore((s) => s.sources);
  const messages = useWorkspaceStore((s) => s.messages);
  const streamingMessageId = useWorkspaceStore((s) => s.streamingMessageId);
  const chunksBySource = useWorkspaceStore((s) => s.chunksBySource);
  const zoneWeights = useWorkspaceStore((s) => s.zoneWeights);
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);

  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const appendStreamToken = useWorkspaceStore((s) => s.appendStreamToken);
  const finalizeMessage = useWorkspaceStore((s) => s.finalizeMessage);
  const openViewer = useWorkspaceStore((s) => s.openSourceViewer);
  const setIngestProgress = useWorkspaceStore((s) => s.setIngestProgress);

  const pushTrust = useTrustLog((s) => s.push);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build the active template's quick-actions and system prompt.
  const { actions, systemPrompt } = useMemo(() => {
    if (!activeWorkspaceId) return { actions: DEFAULT_ACTIONS, systemPrompt: '' };
    try {
      const raw = localStorage.getItem('ragulli:active-template:v1');
      if (raw) {
        const map = JSON.parse(raw) as Record<string, string>;
        const tplId = map[activeWorkspaceId];
        if (tplId) {
          const tpl = TEMPLATES.find((t) => t.id === tplId);
          if (tpl) return { actions: tpl.quickActions, systemPrompt: tpl.defaultPrompt };
        }
      }
    } catch {
      /* ignore */
    }
    return { actions: DEFAULT_ACTIONS, systemPrompt: '' };
  }, [activeWorkspaceId]);

  // Auto-scroll to bottom on new tokens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const handleCitationOpen = useCallback(
    (sourceId: string, charStart: number) => {
      openViewer(sourceId, charStart);
    },
    [openViewer],
  );

  const buildContextBlock = useCallback(
    (chunks: SearchResult[]): string => {
      if (chunks.length === 0) return '';
      return chunks
        .map((hit, i) => {
          const src = sources.find((s) => s.id === hit.chunk.sourceId);
          const fname = src?.filename ?? 'unknown';
          return `[${i + 1}] (${fname})\n${hit.chunk.text}`;
        })
        .join('\n\n');
    },
    [sources],
  );

  const submit = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      if (!activeWorkspaceId) {
        setError('No active workspace.');
        return;
      }
      const sourceCount = sources.length;
      if (sourceCount === 0) {
        setError('Add a source first.');
        return;
      }

      setError(null);
      setInput('');

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      addMessage(userMsg);

      // Push trust entry for the model call destination.
      const provider: ProviderId = getActiveProvider();
      const providerLabel = providerLabelFor(provider);
      const trustEntry: TrustActivity = {
        id: uuidv4(),
        ts: Date.now(),
        kind: 'model-call',
        summary: `Sending question to ${providerLabel}`,
        destination:
          provider === 'webllm'
            ? 'this browser tab (WebLLM)'
            : provider === 'anthropic'
              ? `${providerLabel} · via stateless Vercel Edge`
              : providerLabel,
      };
      pushTrust(trustEntry);

      // Retrieve.
      let hits: SearchResult[] = [];
      try {
        hits = await topK(trimmed, {
          workspaceId: activeWorkspaceId,
          k: 6,
          weightByZone: zoneWeights,
        });
      } catch (err) {
        setError(`Retrieval failed: ${errMessage(err)}`);
        return;
      }

      const contextBlock = buildContextBlock(hits);
      const sys = `${systemPrompt || 'You are RAGülli, a reading companion. Answer using ONLY the context below. Where appropriate, quote exact phrases from the context so the UI can attach a clickable citation to them. If the answer is not in the context, say so plainly.'}\n\nCONTEXT:\n${contextBlock}`;
      const apiKey = provider === 'webllm' ? '' : (await getKey(provider)) ?? '';
      if (provider !== 'webllm' && !hasKey(provider)) {
        // The dispatcher emits a friendly error chunk for this case;
        // we still surface it inline rather than as a throw so the
        // user can read the hint about Settings.
        setError(`Add a key in Settings to use ${providerLabel}.`);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      addMessage(assistantMsg);
      setIsStreaming(true);

      const { streamChat } = await import('@/features/llm');
      const collected: string[] = [];
      try {
        for await (const chunk of streamChat({
          provider,
          model: defaultModelFor(provider),
          apiKey,
          messages: [
            { id: uuidv4(), role: 'system', content: sys, createdAt: Date.now() },
            userMsg,
          ],
          onTrust: (e) => pushTrust(e),
        })) {
          applyStreamChunk(chunk, assistantMsg.id, collected, appendStreamToken, setError);
        }
      } catch (err) {
        setError(`Model call failed: ${errMessage(err)}`);
      }

      // Build citations against the answer.
      const finalText = collected.join('');
      const builtCitations = buildCitations(
        finalText,
        { chunks: hits.map((h) => h.chunk) },
        CITATION_MODE,
      );
      finalizeMessage(assistantMsg.id, {
        content: finalText,
        citations: builtCitations.map((c) => ({
          id: uuidv4(),
          chunkId: c.chunkId,
          sourceId: c.sourceId,
          charStart: c.charStart,
          charEnd: c.charEnd,
        })),
      });

      pushTrust({
        id: uuidv4(),
        ts: Date.now(),
        kind: 'model-response',
        summary: `Answer received (${finalText.length} chars)`,
        destination: 'this browser tab',
      });
      setIsStreaming(false);
      void setIngestProgress;
    },
    [
      activeWorkspaceId,
      sources.length,
      addMessage,
      pushTrust,
      buildContextBlock,
      systemPrompt,
      zoneWeights,
      appendStreamToken,
      finalizeMessage,
      setIngestProgress,
    ],
  );

  const onSubmitForm = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void submit(input);
  };

  const totalChunks = useMemo(() => {
    return Object.values(chunksBySource).reduce((sum, arr) => sum + arr.length, 0);
  }, [chunksBySource]);

  const showEmpty = sources.length === 0 && !ingestProgress;

  return (
    <aside className="h-full flex flex-col bg-[var(--color-surface-1)] border-l border-[var(--color-border)]">
      <header className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-fg)]">Chat</h2>
          <p className="text-[11px] text-[var(--color-fg-muted)]">
            {sources.length === 0
              ? 'Drop a file to start'
              : `${sources.length} source${sources.length === 1 ? '' : 's'} · ${totalChunks} chunks`}
          </p>
        </div>
        {isStreaming ? (
          <span className="text-[11px] uppercase tracking-wide text-[var(--color-accent)]">
            streaming
          </span>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
        {showEmpty ? (
          <EmptyState />
        ) : (
          messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              isStreaming={isStreaming && m.id === streamingMessageId}
              onOpenCitation={handleCitationOpen}
            />
          ))
        )}
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : null}
      </div>

      <footer className="px-4 py-3 border-t border-[var(--color-border)] flex flex-col gap-2">
        <QuickActions
          actions={actions}
          onSelect={(a) => void submit(a.prompt)}
          disabled={sources.length === 0 || isStreaming}
        />
        <form onSubmit={onSubmitForm} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              sources.length === 0
                ? 'Drop a file to start'
                : 'Ask a question. Cite the line.'
            }
            disabled={sources.length === 0 || isStreaming}
            aria-label="Ask a question"
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 h-9 text-sm text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)] disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={sources.length === 0 || isStreaming || input.trim().length === 0}
          >
            Send
          </Button>
        </form>
      </footer>
    </aside>
  );
};

const EmptyState: FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
    <p className="text-sm text-[var(--color-fg)]">Drop a file to start</p>
    <p className="text-xs text-[var(--color-fg-muted)] max-w-xs">
      Every answer cites the line. Every byte stays in this tab.
    </p>
  </div>
);

type MessageRowProps = {
  message: ChatMessage;
  isStreaming: boolean;
  onOpenCitation: (sourceId: string, charStart: number) => void;
};

const MessageRow: FC<MessageRowProps> = ({ message, isStreaming, onOpenCitation }) => {
  const sources = useWorkspaceStore((s) => s.sources);
  const segments = useMemo(() => {
    if (message.role !== 'assistant' || !message.citations) return undefined;
    const builtin = message.citations.map((c) => ({
      chunkId: c.chunkId,
      sourceId: c.sourceId,
      quote: message.content.slice(c.charStart, c.charEnd),
      charStart: c.charStart,
      charEnd: c.charEnd,
    }));
    return segmentForRender(message.content, builtin as BuiltCitation[]);
  }, [message]);

  const sourcesUsed = useMemo(() => {
    if (message.role !== 'assistant' || !message.citations) return undefined;
    const seen = new Set<string>();
    const out: Array<{ label: string; sourceId: string; charStart: number }> = [];
    for (const c of message.citations) {
      if (seen.has(c.chunkId)) continue;
      seen.add(c.chunkId);
      const src = sources.find((s) => s.id === c.sourceId);
      const fname = src?.filename ?? 'source';
      out.push({ label: fname, sourceId: c.sourceId, charStart: c.charStart });
    }
    return out;
  }, [message, sources]);

  return (
    <Message
      role={message.role}
      content={isStreaming && message.content === '' ? '…' : message.content}
      segments={segments}
      onOpenCitation={onOpenCitation}
      sourcesUsed={sourcesUsed}
    />
  );
};

function applyStreamChunk(
  chunk: StreamChunk,
  assistantId: string,
  collected: string[],
  append: (id: string, token: string) => void,
  setError: (msg: string) => void,
): void {
  if (chunk.type === 'token') {
    const text = chunk.text;
    if (typeof text === 'string' && text.length > 0) {
      append(assistantId, text);
      collected.push(text);
    }
    return;
  }
  if (chunk.type === 'error') {
    setError(chunk.message);
    return;
  }
  // 'done' is a no-op for the UI; finalize happens after the loop.
}

function providerLabelFor(p: ProviderId): string {
  switch (p) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'google':
      return 'Google Gemini';
    case 'minimax':
      return 'MiniMax';
    case 'kimi':
      return 'Moonshot Kimi';
    case 'webllm':
      return 'In-browser model';
  }
}

function defaultModelFor(p: ProviderId): string {
  switch (p) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-sonnet-4-5';
    case 'google':
      return 'gemini-1.5-flash';
    case 'minimax':
      return 'MiniMax-Text-01';
    case 'kimi':
      return 'moonshot-v1-8k';
    case 'webllm':
      return 'Phi-3.5-mini-instruct-q4f16_1-MLC';
  }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}