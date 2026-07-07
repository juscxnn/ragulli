// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Tabs.

import { useState, type FC } from 'react';
import { Tabs, type TabItem } from './Tabs';

const items: TabItem[] = [
  { id: 'summary', label: 'Summary', content: <p>3 sections. 4 figures. 1 acknowledged limitation.</p> },
  { id: 'quotes', label: 'Quotes', content: <p>Highlighted passages from the source.</p> },
  { id: 'meta', label: 'Meta', content: <p>File: research-paper.pdf. 14 pages. Embedded with bge-small-en-v1.5.</p> },
];

export const TabsStories: FC = () => {
  const [value, setValue] = useState('summary');
  return <div className="p-6"><Tabs items={items} value={value} onChange={setValue} /></div>;
};

export default TabsStories;
