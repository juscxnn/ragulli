// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// OPFS helpers. We store the original file bytes in OPFS so a "Clear all
// my data" can wipe them deterministically. The IndexedDB row holds the
// path, not the bytes.

const ROOT = 'ragulli-files';

export async function writeSourceBytes(sourceId: string, file: File | Blob): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(ROOT, { create: true });
  const handle = await dir.getFileHandle(sourceId, { create: true });
  const writable = await (handle as FileSystemFileHandle & {
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }).createWritable();
  await writable.write(file);
  await writable.close();
  return `${ROOT}/${sourceId}`;
}

export async function readSourceBytes(originOpfsPath: string): Promise<File> {
  const [dirName, fileName] = originOpfsPath.split('/');
  if (!dirName || !fileName) {
    throw new Error(`Invalid OPFS path: ${originOpfsPath}`);
  }
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(dirName);
  const handle = await dir.getFileHandle(fileName);
  return handle.getFile();
}

export async function deleteAllOpfs(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  try {
    await root.removeEntry(ROOT, { recursive: true });
  } catch {
    // Already gone.
  }
}
