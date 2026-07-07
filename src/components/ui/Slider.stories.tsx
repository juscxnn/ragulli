// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Story companion for Slider.

import { useState, type FC } from 'react';
import { Slider } from './Slider';

export const SliderStories: FC = () => {
  const [v, setV] = useState(1);
  return (
    <div className="p-6 max-w-sm">
      <Slider label="Zone weight" value={v} onChange={setV} />
    </div>
  );
};

export default SliderStories;
