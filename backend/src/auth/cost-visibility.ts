import type { SessionUser } from './session-user.js';

/**
 * Custo (CMV, custo do insumo, custo da entrada) só sai pela API para o admin (2026-10-25): o
 * caixa não recebe nem para a tela esconder, senão um GET logado como caixa revela o CMV do
 * cardápio. As rotas que os dois perfis dividem tiram os campos com esta pergunta.
 *
 * @example seesCosts({ id: 2, name: 'caixa', role: 'CAIXA' }) // false
 */
export function seesCosts(user: SessionUser): boolean {
  return user.role === 'ADMIN';
}

/** Linha com custo por unidade (insumo, entrada, lote); sem o campo para quem não vê custo. */
export type UnitCostView<T extends { unitCost: string | null }> =
  T | Omit<T, 'unitCost'>;

/**
 * A linha inteira para o admin; sem o `unitCost` para o caixa.
 *
 * @example withUnitCostFor(caixa, { id: 3, unitCost: '4.50' }) // { id: 3 }
 */
export function withUnitCostFor<T extends { unitCost: string | null }>(
  user: SessionUser,
  row: T,
): UnitCostView<T> {
  if (seesCosts(user)) return row;
  const { unitCost: _cost, ...rest } = row;
  return rest;
}
