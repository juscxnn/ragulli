// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the OPFS helpers. We use the in-memory FileSystemDirectoryHandle
// stub installed by tests/setup.ts, which mirrors the subset of the API
// our helpers actually use.

import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, getFile, listAll, putFile } from '@/lib/opfs';

interface OpfsMock {
  _root: Map<string, unknown>;
}

function mock(): OpfsMock {
  return (globalThis as unknown as { __ragulliOpfsMock: OpfsMock }).__ragulliOpfsMock;
}

async function resetOpfs() {
  await clearAll();
}

describe('OPFS helpers', () => {
  beforeEach(async () => {
    await resetOpfs();
  });

  it('writes a file via putFile and reads it back via getFile (round-trip)', async () => {
    const file = new File(['hello world'], 'hello.txt', { type: 'text/plain' });
    await putFile('ragulli-files/hello.txt', file);
    const back = await getFile('ragulli-files/hello.txt');
    expect(back).toBeInstanceOf(File);
    expect(back.name).toBe('hello.txt');
    const text = await back.text();
    expect(text).toBe('hello world');
    expect(back.size).toBe(11);
  });

  it('overwrites an existing file when putFile is called twice', async () => {
    await putFile('ragulli-files/x.txt', new File(['one'], 'x.txt'));
    await putFile('ragulli-files/x.txt', new File(['two'], 'x.txt'));
    const back = await getFile('ragulli-files/x.txt');
    expect(await back.text()).toBe('two');
  });

  it('treats a bare filename as a file inside the default directory', async () => {
    await putFile('note.txt', new File(['plain'], 'note.txt'));
    const back = await getFile('ragulli-files/note.txt');
    expect(await back.text()).toBe('plain');
  });

  it('listAll returns every stored file path', async () => {
    await putFile('ragulli-files/a.txt', new File(['a'], 'a.txt'));
    await putFile('ragulli-files/b.txt', new File(['b'], 'b.txt'));
    const paths = await listAll();
    expect(paths.sort()).toEqual(['ragulli-files/a.txt', 'ragulli-files/b.txt']);
  });

  it('clearAll wipes the OPFS tree', async () => {
    await putFile('ragulli-files/a.txt', new File(['a'], 'a.txt'));
    await putFile('ragulli-files/b.txt', new File(['b'], 'b.txt'));
    const before = await listAll();
    expect(before).toHaveLength(2);

    await clearAll();

    const after = await listAll();
    expect(after).toEqual([]);
    expect(mock()._root.size).toBe(0);
  });

  it('clearAll is idempotent when there is nothing to clear', async () => {
    await clearAll();
    await clearAll();
    const after = await listAll();
    expect(after).toEqual([]);
  });

  it('throws on getFile for a missing path', async () => {
    await expect(getFile('ragulli-files/does-not-exist.txt')).rejects.toThrow();
  });
});
