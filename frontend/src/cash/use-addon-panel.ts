import { useEffect, useRef, useState, type RefObject } from 'react';
import type { DraftLine } from './order-lines';

/** Qual linha está com o painel de adicionais aberto, e como abrir e fechar. */
export interface AddonPanelState {
  lineId: number | null;
  open(lineId: number): void;
  /** F4: abre o painel da última linha (se houver). */
  openLast(lines: DraftLine[]): void;
  /** `returnFocus`: volta o foco ao Item (Esc e "Pronto"; clique fora, não). */
  close(returnFocus: boolean): void;
}

/**
 * Painel de adicionais e observação de uma linha da comanda (pedido do usuário, 2026-10-09:
 * jeito visual para quem não usa o "+bacon").
 *
 * `returnRef` recebe o foco ao fechar pelo teclado (o Qtd, começo do próximo item).
 *
 * @example const panel = useAddonPanel(quantityRef); panel.openLast(lines);
 */
export function useAddonPanel(
  returnRef: RefObject<HTMLInputElement | null>,
): AddonPanelState {
  const [lineId, setLineId] = useState<number | null>(null);
  const focusOnCloseRef = useRef(false);
  // A janela é modal (2026-11-25): enquanto ela está aberta o Qtd fica inerte e o focus() não
  // pega. O foco volta depois que a janela sai da tela, quando o efeito roda.
  useEffect(() => {
    if (lineId !== null || !focusOnCloseRef.current) return;
    focusOnCloseRef.current = false;
    returnRef.current?.focus();
  }, [lineId, returnRef]);
  return {
    lineId,
    open: setLineId,
    openLast: (lines) => setLineId(lines.at(-1)?.id ?? null),
    close: (returnFocus) => {
      focusOnCloseRef.current = returnFocus;
      setLineId(null);
    },
  };
}
