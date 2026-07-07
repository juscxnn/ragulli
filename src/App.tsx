// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// App — single-page shell. Topbar (logo + tagline + info + settings).
// Three-column workspace below: sidebar (workspace switcher) · canvas
// (sources + zones) · chat (questions + answers). The trust chip
// and active trust panel ride in the corners. When the active
// workspace has no sources yet, the center column shows the
// FirstDrop hero (spec Scene 1) so the four-second rule on first
// open is honored; the first successful ingest swaps it for the
// canvas. On boot — and whenever the active workspace changes — the
// workspace store is rehydrated from IndexedDB so a reload never
// loses sources, zones, or the chat thread.

import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GearIcon, InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FirstDrop } from '@/features/dropzone/FirstDrop';
import { TrustPanel } from '@/features/trust/TrustPanel';
import { useTrustLog } from '@/features/trust/TrustLog';
import { Settings } from '@/features/settings/Settings';
import { TemplatePicker } from '@/features/templates/TemplatePicker';
import { WorkspaceSwitcher } from '@/features/workspace/sidebar/WorkspaceSwitcher';
import { Canvas } from '@/features/workspace/canvas/Canvas';
import { ChatPanel } from '@/features/workspace/chat/ChatPanel';
import { SourceViewer, type SourceViewerHandle } from '@/features/workspace/SourceViewer';
import { useWorkspaceStore } from '@/features/workspace/store';
import { ingestFiles, reportIngestError } from '@/features/workspace/ingest';
import { db } from '@/lib/db';
import {
  getChatForWorkspace,
  getZonesForWorkspace,
  listChunksForWorkspace,
  listSources,
} from '@/features/retrieval/store';
import type { Chunk, Workspace, TrustActivity } from '@/features/retrieval/types';
import type { Template } from '@/features/templates/templates';
import logoMark from '/logo-mark.svg';

const SAMPLE_URL_PARAM = 'sample';
const TEMPLATE_URL_PARAM = 'template';

/** Custom event any panel can dispatch to open the Settings dialog. */
export const OPEN_SETTINGS_EVENT = 'ragulli:open-settings';

export const App: FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const viewerRef = useRef<SourceViewerHandle>(null);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const sourceCount = useWorkspaceStore((s) => s.sources.length);
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const clearAll = useWorkspaceStore((s) => s.clearAll);
  const pushTrust = useTrustLog((s) => s.push);

  // Bootstrap: hydrate workspaces from IndexedDB and create a
  // default workspace if none exist. Done once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Hydrate the trust log.
      useTrustLog.getState().hydrate();

      let rows: Workspace[] = [];
      try {
        rows = await db.workspaces.toArray();
      } catch {
        rows = [];
      }
      if (cancelled) return;
      const sorted = rows.slice().sort((a, b) => a.createdAt - b.createdAt);
      if (sorted.length > 0) {
        const first = sorted[0]!;
        useWorkspaceStore.getState().setWorkspaces(sorted);
        if (!useWorkspaceStore.getState().activeWorkspaceId) {
          setActiveWorkspace(first.id);
        }
      } else {
        // Create a default workspace so the chat panel and canvas
        // can mount immediately.
        const ws = await createWorkspace();
        if (!cancelled) {
          addWorkspace(ws);
          setActiveWorkspace(ws.id);
        }
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [addWorkspace, setActiveWorkspace]);

  // Rehydrate the active workspace's rows from IndexedDB: sources,
  // chunks (grouped by source), zones (+ weights), and the persisted
  // chat thread. Re-runs whenever the active workspace changes so
  // switching workspaces always shows that workspace's data.
  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [sources, chunks, zones, chat] = await Promise.all([
          listSources(activeWorkspaceId),
          listChunksForWorkspace(activeWorkspaceId),
          getZonesForWorkspace(activeWorkspaceId),
          getChatForWorkspace(activeWorkspaceId),
        ]);
        if (cancelled) return;

        const bySource = new Map<string, Chunk[]>();
        for (const c of chunks) {
          const arr = bySource.get(c.sourceId) ?? [];
          arr.push(c);
          bySource.set(c.sourceId, arr);
        }
        const chunkCounts: Record<string, number> = {};
        for (const [sid, arr] of bySource) chunkCounts[sid] = arr.length;

        const store = useWorkspaceStore.getState();
        store.setSources(sources, chunkCounts);
        for (const [sid, arr] of bySource) store.setChunksForSource(sid, arr);
        const weights: Record<string, number> = {};
        for (const z of zones) weights[z.id] = z.weight;
        store.setZones(zones, weights);
        // Only replace the thread when a persisted chat exists — an
        // in-flight (not yet saved) thread must not be wiped by a
        // slow hydration pass.
        if (chat && chat.messages.length > 0) {
          store.setMessages(chat.messages);
        }
      } catch (err) {
        if (cancelled) return;
        pushTrust({
          id: uuidv4(),
          ts: Date.now(),
          kind: 'error',
          summary: `Could not restore this workspace from local storage: ${errMessage(err)}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, pushTrust]);

  // Query-param deep links: ?template=foo opens the picker with
  // that template preselected; ?sample=paper fetches and ingests
  // the named sample on first paint (once).
  const sampleIngestStarted = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get(TEMPLATE_URL_PARAM);
    if (tpl) {
      setTemplatePickerOpen(true);
      // Pre-select by storing the choice under the active workspace.
      const wsId = activeWorkspaceId;
      if (wsId) {
        try {
          const raw = localStorage.getItem('ragulli:active-template:v1');
          const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
          map[wsId] = tpl;
          localStorage.setItem('ragulli:active-template:v1', JSON.stringify(map));
          // Bump the template version so ChatPanel re-reads and the
          // picker is visually pre-selected. (The dialog is already
          // open; the user just confirms.)
          useWorkspaceStore.getState().bumpTemplateVersion();
        } catch {
          /* ignore */
        }
      }
    }
    const sample = params.get(SAMPLE_URL_PARAM);
    if (sample && activeWorkspaceId && !sampleIngestStarted.current) {
      sampleIngestStarted.current = true;
      void fetchAndIngestSample(sample, activeWorkspaceId, pushTrust);
    }
  }, [activeWorkspaceId, pushTrust]);

  // Panels (e.g. the chat panel's no-key hint) can request the
  // Settings dialog without prop-drilling through the shell.
  useEffect(() => {
    const onOpen = (): void => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  const onTemplatePick = useCallback((t: Template) => {
    setTemplatePickerOpen(false);
    void t;
  }, []);

  const onClearAllData = useCallback(() => {
    clearAll();
    // Also wipe localStorage keys owned by the workspace layer.
    try {
      localStorage.removeItem('ragulli:active-template:v1');
    } catch {
      /* ignore */
    }
  }, [clearAll]);

  // Scene 1: with no sources and no ingest in flight, the center
  // column is the FirstDrop hero. An in-flight ingest (or one that
  // just finished) swaps to the canvas so progress renders there; a
  // failed ingest returns here and the hero shows the error.
  const ingestInFlight =
    ingestProgress !== null && ingestProgress.phase !== 'error';
  const showFirstDrop = sourceCount === 0 && !ingestInFlight;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <Topbar
        onOpenInfo={() => setInfoOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {activeWorkspaceId ? (
        <main className="flex-1 flex min-h-0">
          <div className="w-56 shrink-0">
            <WorkspaceSwitcher />
          </div>
          <div className="flex-1 min-w-0 border-r border-[var(--color-border)] overflow-auto">
            {showFirstDrop ? (
              <FirstDrop workspaceId={activeWorkspaceId} />
            ) : (
              <Canvas workspaceId={activeWorkspaceId} />
            )}
          </div>
          <div className="w-[420px] shrink-0">
            <ChatPanel />
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--color-fg-muted)]">Opening your workspace…</p>
        </main>
      )}

      <TrustPanel />

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
      <TemplatePickerDialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onPick={onTemplatePick}
      />
      <SourceViewer ref={viewerRef} />

      <span data-testid="app-version" className="sr-only">
        v0.1.0
      </span>
      <button
        type="button"
        data-testid="clear-all"
        className="sr-only"
        onClick={onClearAllData}
      >
        clear
      </button>
    </div>
  );
};

export default App;

const Topbar: FC<{ onOpenInfo: () => void; onOpenSettings: () => void }> = ({
  onOpenInfo,
  onOpenSettings,
}) => (
  <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)] shrink-0">
    <div className="flex items-center gap-3">
      <img src={logoMark} alt="RAGülli" width={28} height={28} />
      <span className="font-serif text-lg text-[var(--color-fg)]">RAGülli</span>
      <span className="hidden sm:inline text-xs text-[var(--color-fg-muted)] ml-2">
        Your files. Your AI. Your browser.
      </span>
    </div>
    <nav className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="What is RAGülli?"
        leadingIcon={<InfoIcon size={16} />}
        onClick={onOpenInfo}
      >
        ?
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Open settings"
        leadingIcon={<GearIcon size={16} />}
        onClick={onOpenSettings}
      >
        Settings
      </Button>
    </nav>
  </header>
);

const InfoDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="RAGülli"
    description="Your files. Your AI. Your browser."
    width="md"
  >
    <div className="flex flex-col gap-3 text-sm text-[var(--color-fg)]">
      <p>
        RAGülli is a private reading companion that lives entirely in your browser. Drop a
        file, ask a question, get an answer with the line cited. Nothing leaves this tab
        unless you explicitly send a question to a frontier model with your own key.
      </p>
      <ul className="text-xs text-[var(--color-fg-muted)] list-disc pl-5">
        <li>No account. No signup. No telemetry.</li>
        <li>Every byte of your files stays in this tab.</li>
        <li>BYOK for cloud models; an in-browser model is available too.</li>
      </ul>
    </div>
  </Dialog>
);

const TemplatePickerDialog: FC<{
  open: boolean;
  onClose: () => void;
  onPick: (t: Template) => void;
}> = ({ open, onClose, onPick }) => {
  const wsId = useWorkspaceStore((s) => s.activeWorkspaceId);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pick a template"
      description="Each template seeds the chat prompt, quick actions, and ingest defaults."
      width="lg"
    >
      <TemplatePicker workspaceId={wsId} onPick={onPick} />
    </Dialog>
  );
};

async function createWorkspace(): Promise<Workspace> {
  const ws: Workspace = {
    id: uuidv4(),
    name: 'Untitled workspace',
    templateId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  try {
    await db.workspaces.put(ws);
  } catch {
    /* in-memory fallback */
  }
  return ws;
}

async function fetchAndIngestSample(
  sampleId: string,
  workspaceId: string,
  pushTrust: (e: TrustActivity) => void,
): Promise<void> {
  const path = samplePathFor(sampleId);
  const filename = basenameFromPath(path ?? sampleId);
  if (!path) {
    reportIngestError(filename, new Error(`Unknown sample "${sampleId}".`));
    return;
  }
  pushTrust({
    id: uuidv4(),
    ts: Date.now(),
    kind: 'file',
    summary: `Fetching sample ${sampleId}`,
    destination: 'this browser tab (sample asset)',
  });
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`The sample could not be fetched (HTTP ${res.status}).`);
    const blob = await res.blob();
    const mime = blob.type || guessMime(filename);
    const file = new File([blob], filename, { type: mime });
    await ingestFiles([file], workspaceId);
  } catch (err) {
    // Errors inside ingestFiles are already surfaced; this catch
    // covers the fetch itself failing.
    reportIngestError(filename, err);
  }
}

function samplePathFor(sampleId: string): string | null {
  switch (sampleId) {
    case 'paper':
      return '/sample-files/sample-paper.pdf';
    case 'contract':
      return '/sample-files/sample-contract.pdf';
    case 'chapter':
      return '/sample-files/sample-chapter.md';
    case 'article':
      return '/sample-files/sample-article.html';
    default:
      return null;
  }
}

function basenameFromPath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? 'sample';
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.md')) return 'text/markdown';
  if (n.endsWith('.html')) return 'text/html';
  return 'text/plain';
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
