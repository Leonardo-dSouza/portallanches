import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Closing } from '../api/types';
import { useAuth } from '../auth/auth-context';
import {
  needsDrawerOpening,
  promptsOpeningOnEntry,
  withOpeningGate,
} from './opening-gate';

/** `auto`: decide pelo login e pela hora; `asked`: tecla do topo ou lançamento barrado. */
type OpeningPrompt = 'auto' | 'asked' | 'dismissed';

export interface DrawerOpening {
  /** O caixa com a trava: lançar antes do troco inicial reabre o diálogo. */
  cash: CashApi;
  /** A noite em andamento ainda espera o troco inicial (mostra a tecla do topo). */
  needsOpening: boolean;
  showDialog: boolean;
  ask(): void;
  dismiss(): void;
}

/**
 * A abertura do caixa sem prender a tela (hotfix 2026-11-13: o admin entrou de dia só para ver
 * o estoque e o diálogo, sem menu nem Sair, exigiu o troco). O diálogo aparece sozinho só para
 * o caixa depois das 6h, fecha com "Agora não" e volta quando alguém tenta lançar.
 *
 * @example const opening = useDrawerOpening(cash, day?.closing, date === null);
 */
export function useDrawerOpening(
  cash: CashApi,
  closing: Closing | undefined,
  isLiveNight: boolean,
): DrawerOpening {
  const role = useAuth().user?.role;
  const [prompt, setPrompt] = useState<OpeningPrompt>('auto');
  const needsOpening =
    closing !== undefined && needsDrawerOpening(isLiveNight, closing);
  // A trava lê o valor mais novo sem trocar o `cash` das abas (trocar remontaria os formulários).
  const needsOpeningRef = useRef(needsOpening);
  useEffect(() => {
    needsOpeningRef.current = needsOpening;
  });
  const isBlocked = useCallback(() => {
    if (!needsOpeningRef.current) return false;
    setPrompt('asked');
    return true;
  }, []);
  const gated = useMemo(
    // `isBlocked` só lê a ref quando alguém lança (evento), nunca na renderização.
    // oxlint-disable-next-line react/refs
    () => withOpeningGate(cash, isBlocked),
    [cash, isBlocked],
  );
  const autoPrompt =
    prompt === 'auto' && promptsOpeningOnEntry(role, new Date());
  return {
    cash: gated,
    needsOpening,
    showDialog: needsOpening && (prompt === 'asked' || autoPrompt),
    ask: () => setPrompt('asked'),
    dismiss: () => setPrompt('dismissed'),
  };
}
