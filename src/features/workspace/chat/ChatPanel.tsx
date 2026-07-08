// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ChatPanel — the right rail. Owns the question input, the streaming
// chat, and the citation click→source-viewer navigation. Implements
// spec Scenes 3 and 4:
//   - Empty state: "Drop a file to start" + 4 quick-action chips
//   - Streaming: pull top-K chunks from `topK`, build a context-
//     block prompt, call `streamChat`, segment the final answer via
//     `buildCitations` + `segmentForRender`, render segments with
//     CitationSpan for clickable spans.
//   - Sources-used footer under each assistant message.
//   - No-key mode: when the active provider needs a key and none is
//     saved, we still run local retrieval and compose an honest
//     extractive answer (quoted passages, real citations) instead of
//     erroring out. Nothing is sent anywhere in that mode.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../store';
import { topK, type SearchResult } from '@/features/retrieval/search';
import type { ChatMessage, TrustActivity } from '@/features/retrieval/types';
import {
  buildCitations,
  segmentForRender,
  getActiveProvider,
  getProvider,
  getModel,
  hasExplicitProviderChoice,
  hasKey,
  getKey,
} from '@/features/llm';
import type { BuiltCitation, CitationMode, ProviderId, StreamChunk } from '@/features/llm';
import { Message } from './Message';
import { type QuickAction } from './QuickActions';
import { composeExtractiveAnswer } from './extractive';
import { persistChat } from './persist';
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
  const templateVersion = useWorkspaceStore((s) => s.templateVersion);

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
    // Re-evaluate whenever the active workspace changes OR the
    // template-version counter is bumped by the picker or the
    // deep-link effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, templateVersion]);

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

      // Resolve the provider and key up front: with no usable key
      // (and a provider that needs one) we answer from local
      // retrieval instead of erroring out, and the trust entry must
      // say so before anything happens.
      const provider: ProviderId = getActiveProvider();
      const providerLabel = providerLabelFor(provider);
      const apiKey = provider === 'webllm' ? '' : ((await getKey(provider)) ?? '');
      // WebLLM is opt-in (spec §4.4): until the user deliberately
      // picks a provider in Settings, answer from local retrieval
      // rather than silently starting a multi-gigabyte download.
      const localOnly =
        provider === 'webllm' ? !hasExplicitProviderChoice() : apiKey.length === 0;

      // Push trust entry for where this question is going.
      const trustEntry: TrustActivity = localOnly
        ? {
            id: uuidv4(),
            ts: Date.now(),
            kind: 'model-call',
            summary:
              provider === 'webllm'
                ? 'Answering from local retrieval — no model connected yet'
                : `Answering from local retrieval — no key saved for ${providerLabel}`,
            destination: 'this browser tab (local retrieval — nothing sent)',
          }
        : {
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

      // No-key mode: compose an honest extractive answer from the
      // retrieved passages. Every quote is a real citation because
      // we build the content string ourselves. Nothing leaves the
      // tab; the keyed/webllm path below is untouched.
      if (localOnly) {
        const { content, citations } = composeExtractiveAnswer(hits, (sourceId) => {
          const src = sources.find((s) => s.id === sourceId);
          return src?.filename ?? 'source';
        });
        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
        };
        addMessage(assistantMsg);
        finalizeMessage(assistantMsg.id, { content, citations });
        pushTrust({
          id: uuidv4(),
          ts: Date.now(),
          kind: 'model-response',
          summary:
            citations.length > 0
              ? `Extractive answer composed from ${citations.length} passage${citations.length === 1 ? '' : 's'}`
              : 'Local retrieval found no relevant passages',
          destination: 'this browser tab (local retrieval — nothing sent)',
        });
        // Best-effort persistence so a reload keeps the thread.
        void persistChat(activeWorkspaceId, useWorkspaceStore.getState().messages);
        return;
      }

      const contextBlock = buildContextBlock(hits);
      const sys = `${systemPrompt || 'You are RAGülli, a reading companion. Answer using ONLY the context below. Where appropriate, quote exact phrases from the context so the UI can attach a clickable citation to them. If the answer is not in the context, say so plainly.'}\n\nCONTEXT:\n${contextBlock}`;

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
          model: getModel(provider),
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
      // Best-effort persistence so a reload keeps the thread.
      void persistChat(activeWorkspaceId, useWorkspaceStore.getState().messages);
      void setIngestProgress;
    },
    [
      activeWorkspaceId,
      sources,
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

  // No-key mode indicator. hasKey is a cheap synchronous localStorage
  // read, so recomputing per render keeps the banner honest without
  // extra plumbing.
  const activeProvider = getActiveProvider();
  const keyMissing =
    getProvider(activeProvider).needsKey && !hasKey(activeProvider);

  const openSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent('ragulli:open-settings'));
  }, []);

  const hasSources = sources.length > 0;
  const noMessages = messages.length === 0;
  const canAsk = hasSources && !isStreaming;

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim().length > 0 && canAsk) void submit(input);
    }
  };

  return (
    <aside className="h-full min-h-0 flex flex-col bg-[var(--color-surface-1)]">
      <header className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-[var(--color-fg)]">Chat</h2>
          <span className="text-[11px] text-[var(--color-fg-muted)]">
            {hasSources
              ? `${sources.length} source${sources.length === 1 ? '' : 's'} · ${totalChunks} chunk${totalChunks === 1 ? '' : 's'}`
              : 'no sources yet'}
          </span>
        </div>
        {isStreaming ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--color-accent)]">
            <span className="flex gap-0.5" aria-hidden>
              <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:150ms]" />
              <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:300ms]" />
            </span>
            thinking
          </span>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {noMessages ? (
          <EmptyState
            hasSources={hasSources}
            suggestions={actions.slice(0, 4)}
            onPick={(prompt) => canAsk && void submit(prompt)}
            disabled={!canAsk}
          />
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
            className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : null}
      </div>

      <footer className="px-4 py-3 border-t border-[var(--color-border)] flex flex-col gap-2.5 shrink-0">
        {keyMissing && hasSources ? (
          <div
            data-testid="no-key-hint"
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-[11px] text-[var(--color-fg-muted)]"
          >
            <span>Local mode — answers quote your sources. Connect a model for synthesis.</span>
            <button
              type="button"
              onClick={openSettings}
              className="shrink-0 text-[var(--color-accent)] hover:underline"
            >
              Connect
            </button>
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-0.5 px-1 [scrollbar-width:none]">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => void submit(a.prompt)}
                disabled={!canAsk}
                className="shrink-0 text-xs px-3 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        <form onSubmit={onSubmitForm} className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder={hasSources ? 'Ask anything about your sources' : 'Add a source to begin'}
            disabled={!hasSources || isStreaming}
            aria-label="Ask a question"
            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)]/70 focus:outline-none focus-visible:shadow-[var(--shadow-glow)] disabled:opacity-50 max-h-32"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            aria-label="Send"
            disabled={!canAsk || input.trim().length === 0}
            className="h-10 shrink-0"
          >
            Send
          </Button>
        </form>
      </footer>
    </aside>
  );
};

const EmptyState: FC<{
  hasSources: boolean;
  suggestions: QuickAction[];
  onPick: (prompt: string) => void;
  disabled: boolean;
}> = ({ hasSources, suggestions, onPick, disabled }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-10 animate-rise">
    <div className="flex flex-col items-center gap-2">
      <p className="font-serif text-lg text-[var(--color-fg)]">
        {hasSources ? 'Ask anything' : 'Add a source to begin'}
      </p>
      <p className="text-xs text-[var(--color-fg-muted)] max-w-[16rem] leading-relaxed">
        Every answer quotes your sources and links to the exact line. Nothing leaves this tab.
      </p>
    </div>
    {hasSources && suggestions.length > 0 ? (
      <div className="w-full max-w-xs flex flex-col gap-2 pt-1">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            disabled={disabled}
            className="text-left text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    ) : null}
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

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}