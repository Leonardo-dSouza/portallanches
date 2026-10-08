import { useEffect, type RefObject } from 'react';

/**
 * Fecha um painel aberto ao clicar fora dele (`outside`) ou com Esc (`escape`): o painel
 * decide se devolve o foco (Esc devolve; clique fora não, o usuário já foi para outro lugar).
 *
 * @example useDismiss(containerRef, (reason) => close(reason === 'escape'));
 */
export function useDismiss(
  container: RefObject<HTMLElement | null>,
  onDismiss: (reason: 'outside' | 'escape') => void,
): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !container.current?.contains(target)) onDismiss('outside');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss('escape');
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [container, onDismiss]);
}
