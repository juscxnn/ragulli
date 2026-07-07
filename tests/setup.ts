// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Vitest global setup. Stubs the OPFS-backed navigator.storage.getDirectory
// with an in-memory implementation so the opfs helpers and any feature
// that writes to OPFS can run under jsdom. The stub mirrors the subset
// of the FileSystemDirectoryHandle API the helpers actually use:
// getDirectoryHandle, getFileHandle, removeEntry, createWritable, getFile,
// and the async entries() iterator.
//
// We also polyfill a few browser-only globals that pdfjs-dist touches
// at module load. We never actually call the rendering code, so a
// no-op shim is sufficient to let the module load under jsdom.
//
// Finally, we side-effect-import pdfjs-dist's legacy worker module
// so `globalThis.pdfjsWorker.WorkerMessageHandler` is set. The main
// build looks for this global when the worker is not available; if
// it is missing, the main build tries to dynamically `import()`
// `GlobalWorkerOptions.workerSrc` (a string), which fails in Node.

interface MemoryEntry {
  kind: 'file' | 'directory';
  file?: File;
  children?: Map<string, MemoryEntry>;
}

// pdfjs-dist v5 reads `globalThis.DOMMatrix` at module load. jsdom
// does not provide it. We add a minimal no-op shim so the import
// graph can resolve. None of the methods below are called by our
// text-only parser path; they exist only to satisfy the type.
if (typeof globalThis.DOMMatrix === 'undefined') {
  class NoopDOMMatrix {
    constructor(_init?: string | number[] | DOMMatrix) {
      void _init;
    }
    multiplySelf(): NoopDOMMatrix {
      return this;
    }
    translateSelf(): NoopDOMMatrix {
      return this;
    }
    scaleSelf(): NoopDOMMatrix {
      return this;
    }
    invertSelf(): NoopDOMMatrix {
      return this;
    }
    transformPoint(p: { x: number; y: number }): { x: number; y: number } {
      return p;
    }
  }
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrix }).DOMMatrix =
    NoopDOMMatrix as unknown as typeof DOMMatrix;
}

// Pre-load the legacy worker module so it registers
// `globalThis.pdfjsWorker.WorkerMessageHandler`. The main pdfjs
// build falls back to this global when no real worker is
// configured; without it, the main build tries to dynamically
// `import(GlobalWorkerOptions.workerSrc)` (a string) which throws
// in Node because empty `workerSrc` is not a resolvable specifier.
// We import this lazily so any failure is contained to tests that
// actually need it.
async function ensurePdfjsFakeWorker(): Promise<void> {
  if ((globalThis as unknown as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker) {
    return;
  }
  try {
    await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  } catch {
    // Some environments (e.g. ESM-only tooling) cannot load the
    // legacy worker. Tests that need pdfjs will skip in that case.
  }
}

void ensurePdfjsFakeWorker();

function createMemoryHandle(
  root: Map<string, MemoryEntry>,
  name: string,
  entry: MemoryEntry,
): unknown {
  const handle = {
    kind: entry.kind,
    name,
    async getFileHandle(childName: string, options?: { create?: boolean }) {
      let child = entry.children?.get(childName);
      if (!child) {
        if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
        if (!entry.children) entry.children = new Map();
        child = { kind: 'file' };
        entry.children.set(childName, child);
      }
      if (child.kind !== 'file') throw new DOMException('Type mismatch', 'TypeMismatchError');
      return createMemoryHandle(root, childName, child);
    },
    async getDirectoryHandle(childName: string, options?: { create?: boolean }) {
      let child = entry.children?.get(childName);
      if (!child) {
        if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
        if (!entry.children) entry.children = new Map();
        child = { kind: 'directory', children: new Map() };
        entry.children.set(childName, child);
      }
      if (child.kind !== 'directory' || !child.children) {
        throw new DOMException('Type mismatch', 'TypeMismatchError');
      }
      return createMemoryHandle(root, childName, child);
    },
    async removeEntry(childName: string, options?: { recursive?: boolean }) {
      if (!entry.children?.has(childName)) {
        throw new DOMException('Not found', 'NotFoundError');
      }
      entry.children.delete(childName);
      void options;
    },
    async createWritable() {
      if (entry.kind !== 'file') throw new DOMException('Not a file', 'TypeMismatchError');
      const buffer: Uint8Array[] = [];
      return {
        async write(chunk: BodyInit) {
          let bytes: Uint8Array;
          if (chunk instanceof Blob) {
            bytes = new Uint8Array(await chunk.arrayBuffer());
          } else if (chunk instanceof ArrayBuffer) {
            bytes = new Uint8Array(chunk);
          } else if (chunk instanceof Uint8Array) {
            bytes = chunk;
          } else if (typeof chunk === 'string') {
            bytes = new TextEncoder().encode(chunk);
          } else {
            bytes = new Uint8Array(0);
          }
          buffer.push(bytes);
        },
        async close() {
          const total = buffer.reduce((sum, b) => sum + b.length, 0);
          const merged = new Uint8Array(total);
          let offset = 0;
          for (const b of buffer) {
            merged.set(b, offset);
            offset += b.length;
          }
          entry.file = new File([merged], name);
        },
      };
    },
    async getFile() {
      if (entry.kind !== 'file') throw new DOMException('Not a file', 'TypeMismatchError');
      return entry.file ?? new File([new Uint8Array(0)], name);
    },
    async *entries(): AsyncIterableIterator<[string, unknown]> {
      if (!entry.children) return;
      for (const [k, v] of entry.children) {
        yield [k, createMemoryHandle(root, k, v)];
      }
    },
    async isSameEntry(other: { _entry: MemoryEntry }) {
      return other._entry === entry;
    },
    _entry: entry,
  };
  return handle;
}

function makeMemoryFileSystem() {
  const root: Map<string, MemoryEntry> = new Map();
  const rootDir: MemoryEntry = { kind: 'directory', children: root };
  return {
    async getDirectory() {
      return createMemoryHandle(root, '', rootDir) as unknown as FileSystemDirectoryHandle;
    },
    _root: root,
  };
}

if (typeof navigator !== 'undefined' && !navigator.storage?.getDirectory) {
  const mem = makeMemoryFileSystem();
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      getDirectory: mem.getDirectory,
    },
  });
  (globalThis as unknown as { __ragulliOpfsMock: ReturnType<typeof makeMemoryFileSystem> })
    .__ragulliOpfsMock = mem;
}
