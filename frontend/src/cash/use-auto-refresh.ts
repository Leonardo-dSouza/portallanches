import { useEffect, useRef } from 'react';

export interface AutoRefreshOptions {
  enabled: boolean;
  intervalMs?: number;
  isPaused?: () => boolean;
}

/**
 * Indica se a atualização periódica deve ser suspensa: quando a aba não está
 * visível ou quando há um modal (<dialog open>) aberto (2026-11-05).
 *
 * @example if (!isRefreshPaused()) reload();
 */
export function isRefreshPaused(doc: Document = document): boolean {
  if (doc.visibilityState !== 'visible') {
    return true;
  }
  return doc.querySelector('dialog[open]') !== null;
}

/**
 * Atualiza o estado da tela a cada `intervalMs` (padrão 20 s) enquanto `enabled`
 * for verdadeiro e a tela não estiver pausada (aba visível e sem modal aberto).
 * Permite que celular e PC vejam pedidos lançados no outro aparelho (2026-11-05).
 *
 * @example useAutoRefresh(() => void reload(), { enabled: date === null });
 */
export function useAutoRefresh(
  refresh: () => void,
  options: AutoRefreshOptions,
): void {
  const { enabled, intervalMs = 20_000, isPaused = isRefreshPaused } = options;
  const refreshRef = useRef(refresh);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    refreshRef.current = refresh;
    isPausedRef.current = isPaused;
  }, [refresh, isPaused]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (isPausedRef.current()) return;
      refreshRef.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs]);
}
