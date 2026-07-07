// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Dropzone.

import type { FC } from 'react';
import { Dropzone } from './Dropzone';

export const DropzoneStories: FC = () => (
  <div className="p-6 max-w-md">
    <Dropzone onFiles={(files) => console.log('dropped', files.length)}>
      <p className="text-sm text-[var(--color-fg-muted)]">
        Drop PDFs, DOCX, Markdown, or plain text here.
      </p>
      <p className="text-xs text-[var(--color-fg-muted)] mt-1">
        Files never leave this browser tab.
      </p>
    </Dropzone>
  </div>
);

export default DropzoneStories;
