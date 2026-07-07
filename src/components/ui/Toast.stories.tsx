// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Toast.

import { useState, type FC } from 'react';
import { Button } from './Button';
import { Toast } from './Toast';

export const ToastStories: FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Show toast</Button>
      <Toast open={open} onClose={() => setOpen(false)} tone="success">
        Embedded 4 files. Nothing left this tab.
      </Toast>
    </div>
  );
};

export default ToastStories;
