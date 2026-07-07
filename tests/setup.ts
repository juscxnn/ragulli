// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Vitest global setup. Stubs the OPFS-backed navigator.storage.getDirectory
// with an in-memory implementation so opfs tests can run under jsdom. The
// stub mirrors the subset of the FileSystemDirectoryHandle API the OPFS
// helpers in src/lib/opfs.ts actually use.

interface MemoryEntry {
  kind: 'file' | 'directory';
  file?: File;
  children?: Map<string, MemoryEntry>;
}

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

interface MemoryFileSystemFileHandle extends FileSystemFileHandle {
  _entry: MemoryEntry;
  getFile: () => Promise<File>;
  createWritable: () => Promise<MemoryWritable>;
}

interface MemoryWritable {
  write: (chunk: BlobPart) => Promise<void>;
  close: () => Promise<void>;
}

function attachFileBehavior(handle: unknown, entry: MemoryEntry) {
  const h = handle as MemoryFileSystemFileHandle;
  h._entry = entry;
  h.kind = 'file';
  h.getFile = async () => {
    if (!entry.file) {
      // Empty placeholder so reads work even before write completes.
      entry.file = new File([new Uint8Array(0)], h.name);
    }
    return entry.file;
  };
  h.createWritable = async () => {
    const buffer: Uint8Array[] = [];
    return {
      async write(chunk: BlobPart) {
        if (chunk instanceof Blob) {
          buffer.push(new Uint8Array(await chunk.arrayBuffer()));
        } else if (chunk instanceof ArrayBuffer) {
          buffer.push(new Uint8Array(chunk));
        } else if (chunk instanceof Uint8Array) {
          buffer.push(chunk);
        } else {
          buffer.push(new TextEncoder().encode(String(chunk)));
        }
      },
      async close() {
        const total = buffer.reduce((sum, b) => sum + b.length, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const b of buffer) {
          merged.set(b, offset);
          offset += b.length;
        }
        entry.file = new File([merged], h.name);
      },
    };
  };
  return h;
}

if (typeof navigator !== 'undefined' && !navigator.storage?.getDirectory) {
  const mem = makeMemoryFileSystem();
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      getDirectory: mem.getDirectory,
    },
  });
  // Re-export for tests that want to inspect the mock state.
  (globalThis as unknown as { __ragulliOpfsMock: ReturnType<typeof makeMemoryFileSystem> })
    .__ragulliOpfsMock = mem;
}

export { attachFileBehavior };
