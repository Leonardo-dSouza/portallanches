import { useState } from 'react';
import {
  readBlocks,
  writeBlocks,
  type AnalyticsBlockId,
  type BlockStorage,
} from './analytics-blocks';

/** `localStorage` do navegador, ou null quando ele nem pode ser lido. */
function browserStorage(): BlockStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface AnalyticsBlocksState {
  shown: ReadonlySet<AnalyticsBlockId>;
  toggle(id: AnalyticsBlockId): void;
}

/**
 * Blocos ligados na Análise, lembrados no navegador entre as visitas.
 *
 * @example const { shown, toggle } = useAnalyticsBlocks();
 */
export function useAnalyticsBlocks(
  storage: BlockStorage | null = browserStorage(),
): AnalyticsBlocksState {
  const [shown, setShown] = useState(() => readBlocks(storage));
  const toggle = (id: AnalyticsBlockId) => {
    const next = new Set(shown);
    if (!next.delete(id)) next.add(id);
    setShown(next);
    writeBlocks(storage, next);
  };
  return { shown, toggle };
}
