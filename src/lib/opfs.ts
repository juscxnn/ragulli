// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// OPFS helpers. We store the original file bytes in OPFS so a
// "Clear all my data" can wipe them deterministically. The
// IndexedDB row holds the path, not the bytes. Paths are slash-
// separated strings like `ragulli-files/<sourceId>`; the first
// segment names a directory under the OPFS root, the rest name
// files inside it. We currently only use a single directory, but
// the helpers accept a path so future features (e.g. cached model
// shards) can be added without an API change.

const DEFAULT_DIR = 'ragulli-files';

type MaybeFileHandle = FileSystemFileHandle & {
  createWritable?: () => Promise<FileSystemWritableFileStream>;
};

function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

function splitPath(path: string): { dir: string; name: string } {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) {
    // Default to the ragulli-files directory if the caller gave a bare name.
    return { dir: DEFAULT_DIR, name: parts[0] ?? '' };
  }
  const name = parts.pop() ?? '';
  const dir = parts.join('/');
  return { dir, name };
}

export async function putFile(path: string, file: File | Blob): Promise<void> {
  const { dir, name } = splitPath(path);
  if (!name) throw new Error(`putFile: empty path "${path}"`);
  const root = await getRoot();
  const dirHandle = await root.getDirectoryHandle(dir, { create: true });
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await (fileHandle as MaybeFileHandle).createWritable!();
  await writable.write(file as FileSystemWritableFileStream['write'] extends (data: infer T) => unknown
    ? T
    : BodyInit);
  await writable.close();
}

export async function getFile(path: string): Promise<File> {
  const { dir, name } = splitPath(path);
  if (!name) throw new Error(`getFile: empty path "${path}"`);
  const root = await getRoot();
  const dirHandle = await root.getDirectoryHandle(dir);
  const fileHandle = await dirHandle.getFileHandle(name);
  return fileHandle.getFile();
}

export async function listAll(): Promise<string[]> {
  const root = await getRoot();
  const out: string[] = [];
  const rootAny = root as unknown as {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  };
  for await (const [dirName, dirHandle] of rootAny.entries()) {
    if (dirHandle.kind !== 'directory') {
      out.push(dirName);
      continue;
    }
    const subAny = dirHandle as unknown as {
      entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    };
    for await (const [name] of subAny.entries()) {
      out.push(`${dirName}/${name}`);
    }
  }
  return out;
}

export async function clearAll(): Promise<void> {
  const root = await getRoot();
  const rootAny = root as unknown as {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  };
  for await (const [name] of rootAny.entries()) {
    try {
      await root.removeEntry(name, { recursive: true });
    } catch {
      // Already gone.
    }
  }
}
