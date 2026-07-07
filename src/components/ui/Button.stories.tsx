// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story — minimal Storybook-style preview companion for Button.

import type { FC, ReactElement } from 'react';
import { GearIcon, InfoIcon } from '@/components/icons';
import { Button } from './Button';

export const ButtonStories: FC = () => {
  const wrap = (label: string, node: ReactElement) => (
    <div key={label} className="flex flex-col gap-2">
      <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
      {node}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {wrap('Primary', <Button>Drop a PDF</Button>)}
      {wrap('Secondary', <Button variant="secondary">Open sample</Button>)}
      {wrap('Ghost', <Button variant="ghost">Cancel</Button>)}
      {wrap('Danger', <Button variant="danger">Clear all data</Button>)}
      {wrap('With leading icon', <Button leadingIcon={<GearIcon size={16} />}>Settings</Button>)}
      {wrap('With trailing icon', <Button trailingIcon={<InfoIcon size={16} />}>Learn more</Button>)}
      {wrap('Disabled', <Button disabled>Not yet</Button>)}
      {wrap('Sizes', (
        <div className="flex items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      ))}
    </div>
  );
};

export default ButtonStories;
