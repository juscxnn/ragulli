// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// SourceViewer — a Dialog that renders the original file. PDFs use
// pdfjs-dist to extract the text of every page and render it as a
// scrollable text column with each page wrapped in a section that
// carries a `data-char-start` attribute. The `scrollToChar` API
// (exposed via the forwardRef on the wrapping element) finds the
// nearest page anchor and scrolls the section into view. Markdown,
// text, and HTML are rendered as styled prose using the project's
// typography tokens (Lora for long-form prose).

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from './store';
import { getFile } from '@/lib/opfs';
import { markdownToPlain } from '@/features/ingest/parsers/markdown';

export type SourceViewerHandle = {
  scrollToChar: (charStart: number) => void;
};

let workerSrcSet = false;
async function ensureWorker(): Promise<void> {
  if (workerSrcSet) return;
  // Vite resolves the `?url` import at BUILD time to the hashed asset
  // path — the same wiring the ingest parser uses. A runtime dynamic
  // import of the bare specifier cannot resolve in a production
  // bundle, which left the viewer unable to render PDFs at all.
  const { default: url } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  GlobalWorkerOptions.workerSrc = url;
  workerSrcSet = true;
}

type PageSection = {
  pageNum: number;
  charStart: number;
  charEnd: number;
  text: string;
};

export const SourceViewer = forwardRef<SourceViewerHandle>(function SourceViewer(_props, ref) {
  const viewer = useWorkspaceStore((s) => s.sourceViewer);
  const closeViewer = useWorkspaceStore((s) => s.closeSourceViewer);
  const sources = useWorkspaceStore((s) => s.sources);

  const source = useMemo(
    () => sources.find((s) => s.id === viewer.sourceId),
    [sources, viewer.sourceId],
  );

  return (
    <Dialog
      open={viewer.open && Boolean(source)}
      onClose={closeViewer}
      title={source?.filename ?? 'Source'}
      description={source ? `${humanMime(source.mimeType)} · ${humanSize(source.byteSize)}` : undefined}
      width="lg"
    >
      {source ? (
        <ViewerBody
          key={source.id}
          source={source}
          pendingCharStart={viewer.charStart}
          ref={ref}
        />
      ) : (
        <p className="text-sm text-[var(--color-fg-muted)]">Source not found.</p>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={closeViewer}>
          Close
        </Button>
      </div>
    </Dialog>
  );
});

type ViewerBodyProps = {
  source: { id: string; filename: string; mimeType: string; originOpfsPath: string };
  pendingCharStart: number;
};

const ViewerBody = forwardRef<SourceViewerHandle, ViewerBodyProps>(function ViewerBody(
  { source, pendingCharStart },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageSection[] | null>(null);
  const [plainText, setPlainText] = useState<string | null>(null);

  const isPdf = useMemo(() => {
    const m = source.mimeType.toLowerCase();
    const n = source.filename.toLowerCase();
    return m === 'application/pdf' || n.endsWith('.pdf');
  }, [source.mimeType, source.filename]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPages(null);
    setPlainText(null);
    (async () => {
      try {
        const file = await getFile(source.originOpfsPath);
        if (cancelled) return;
        if (isPdf) {
          await ensureWorker();
          const doc = await loadPdf(file);
          const sections = await extractPages(doc);
          if (cancelled) return;
          setPages(sections);
        } else {
          const text = await file.text();
          if (cancelled) return;
          if (looksLikeMarkdown(source.filename)) {
            setPlainText(markdownToPlain(text));
          } else {
            setPlainText(text);
          }
        }
      } catch (err) {
        if (!cancelled) setError(errMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source.id, source.originOpfsPath, source.filename, isPdf]);

  const scrollToChar = useCallback(
    (charStart: number) => {
      const root = containerRef.current;
      if (!root) return;
      if (pages) {
        const target = pages.find(
          (p) => charStart >= p.charStart && charStart < p.charEnd,
        );
        const anchor = target
          ? root.querySelector<HTMLElement>(`[data-page-num="${target.pageNum}"]`)
          : null;
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          anchor.classList.add('source-viewer-flash');
          window.setTimeout(() => anchor.classList.remove('source-viewer-flash'), 1200);
          return;
        }
      }
      // Fallback for non-PDF sources: set the offset on a hidden
      // marker, then scroll to the rough proportional position.
      const approx = Math.max(0, Math.min(1, charStart / Math.max(1, (plainText ?? '').length)));
      root.scrollTo({ top: approx * root.scrollHeight, behavior: 'smooth' });
    },
    [pages, plainText],
  );

  useImperativeHandle(ref, () => ({ scrollToChar }), [scrollToChar]);

  // Apply pending scroll once content is rendered.
  useEffect(() => {
    if (loading) return;
    if (pendingCharStart > 0) {
      scrollToChar(pendingCharStart);
    }
  }, [loading, pendingCharStart, scrollToChar]);

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <p className="text-xs text-[var(--color-fg-muted)]">Loading source…</p>
      ) : error ? (
        <p className="text-xs text-[var(--color-danger)]">Could not render: {error}</p>
      ) : pages ? (
        <div
          ref={containerRef}
          className="max-h-[60vh] overflow-auto pr-2 flex flex-col gap-4"
          data-source-id={source.id}
        >
          <style>{`.source-viewer-flash { animation: source-flash 1.2s ease-out; }
@keyframes source-flash { 0% { background: var(--color-accent); } 100% { background: transparent; } }`}</style>
          {pages.map((page) => (
            <section
              key={page.pageNum}
              data-page-num={page.pageNum}
              data-char-start={page.charStart}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3"
            >
              <header className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)] mb-2">
                Page {page.pageNum}
              </header>
              <pre className="font-serif text-sm leading-relaxed text-[var(--color-fg)] whitespace-pre-wrap">
                {page.text}
              </pre>
            </section>
          ))}
        </div>
      ) : plainText !== null ? (
        <div
          ref={containerRef}
          data-source-id={source.id}
          className="max-h-[60vh] overflow-auto pr-2 font-serif text-sm leading-relaxed text-[var(--color-fg)] whitespace-pre-wrap"
        >
          {plainText}
        </div>
      ) : null}
    </div>
  );
});

async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({ data, disableFontFace: true, useSystemFonts: false });
  return task.promise;
}

async function extractPages(doc: PDFDocumentProxy): Promise<PageSection[]> {
  const sections: PageSection[] = [];
  let cursor = 0;
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page: PDFPageProxy = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = joinTextItems(content.items as ReadonlyArray<unknown>);
    sections.push({
      pageNum: i,
      charStart: cursor,
      charEnd: cursor + text.length,
      text,
    });
    cursor += text.length;
  }
  return sections;
}

function joinTextItems(items: ReadonlyArray<unknown>): string {
  const out: string[] = [];
  for (const raw of items) {
    const item = raw as TextItem;
    if (typeof item.str === 'string' && item.str.length > 0) {
      out.push(item.str);
      if (!item.hasEOL) out.push(' ');
    }
  }
  return out.join('').trim();
}

function looksLikeMarkdown(filename: string): boolean {
  const n = filename.toLowerCase();
  return n.endsWith('.md') || n.endsWith('.markdown');
}

function humanMime(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('text/markdown')) return 'Markdown';
  if (mime.startsWith('text/html')) return 'HTML';
  if (mime.startsWith('text/')) return 'Text';
  return mime || 'Unknown';
}

function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}