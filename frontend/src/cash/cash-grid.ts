/**
 * Classe da grade das abas do caixa (Pedidos, Gastos, Consumo). No dia fechado não há comanda:
 * o aviso vira faixa em cima e a lista usa a largura toda (2026-11-10: a coluna da comanda com
 * só o aviso espremia a lista do PC do caixa depois de fechar a noite).
 *
 * @example <div className={cashGridClassName(locked)}>…</div>
 */
export function cashGridClassName(locked: boolean): string {
  return locked ? 'cash-grid cash-grid-closed' : 'cash-grid';
}
