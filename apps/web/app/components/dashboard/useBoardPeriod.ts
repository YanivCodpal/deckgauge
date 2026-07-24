'use client';

import { useContext } from 'react';
import { BoardPeriodContext } from './BoardPeriodProvider';

export function useBoardPeriod() {
  return useContext(BoardPeriodContext);
}
