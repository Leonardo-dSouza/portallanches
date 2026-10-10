import type { StockShortfall } from '../api/types';

/**
 * Saldo baixo da bebida na busca do caixa (aparece abaixo do aviso; padrão 6).
 *
 * @example stockLeftLabel(2) // 'restam 2'
 */
export function stockLeftLabel(units: number): string {
  if (units === 0) return 'sem estoque';
  return units === 1 ? 'resta 1' : `restam ${units}`;
}

/**
 * Aviso depois de salvar um pedido que vendeu além do saldo do sistema (decisão do usuário,
 * 2026-10-09: avisa e deixa vender; fica "Conferir" na Situação). Null = cobriu tudo.
 *
 * @example shortfallNotice([{ supplyId: 30, supplyName: 'Coca lata', missing: '1' }])
 */
export function shortfallNotice(shortfalls: StockShortfall[]): string | null {
  if (shortfalls.length === 0) return null;
  const items = shortfalls
    .map((s) => `${s.supplyName} (faltou ${s.missing})`)
    .join(', ');
  return `Vendido além do estoque do sistema: ${items}. Lance a entrada ou conte em Estoque.`;
}
