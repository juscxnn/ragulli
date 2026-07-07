// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Dialog.

import { useState, type FC } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

export const DialogStories: FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Clear all local data"
        description="This wipes IndexedDB, OPFS, and BYOK keys. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Clear everything
            </Button>
          </>
        }
      >
        <p>
          Hold the button for one second to confirm. RAGülli stores everything in this browser tab;
          clearing it puts you back at the first-open hero.
        </p>
      </Dialog>
    </div>
  );
};

export default DialogStories;
