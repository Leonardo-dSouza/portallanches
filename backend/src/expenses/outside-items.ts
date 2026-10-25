import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Itens da nota fora da lanchonete (pedido do usuário, 2026-10-25): pão de forma, massa de tomate
 * e outras compras de casa no mesmo cupom. Saem do valor do gasto e de Compras → Preços.
 */

/** A decisão gravada de um item: o código do produto no mercado e se ficou de fora. */
export interface OutsideDecision {
  code: string;
  outsideBusiness: boolean;
}

/**
 * Confere as posições marcadas contra a nota (itens 1 a N, como a SEFAZ numera). A nota inteira
 * de fora não é gasto da lanchonete: o caixa tira a nota ou desmarca um item.
 *
 * @example assertOutsidePositions([2], 3) // ok
 */
export function assertOutsidePositions(
  positions: number[],
  itemCount: number,
): void {
  const unknown = positions.find((p) => p > itemCount);
  if (unknown !== undefined)
    throw new BadRequestException(
      `Item ${unknown} não existe na nota (itens 1 a ${itemCount})`,
    );
  if (positions.length > 0 && positions.length >= itemCount)
    throw new UnprocessableEntityException(
      `A nota inteira está fora da lanchonete (${positions.length} de ${itemCount} itens): tire a nota do gasto ou desmarque um item`,
    );
}

/**
 * Marca de item sem nota no gasto (nenhuma lida, ou a nota sendo tirada) é erro do pedido.
 *
 * @example assertNoInvoiceMarks([]) // ok
 */
export function assertNoInvoiceMarks(positions: number[] | undefined): void {
  if (!positions?.length) return;
  throw new BadRequestException(
    `Campo "outsidePositions" sem nota: recebido ${JSON.stringify(positions)}, esperado nenhum item marcado num gasto sem nota fiscal`,
  );
}

/**
 * Códigos que a nota mais recente marcou como de fora ("lembrar" por mercado + código): a
 * lista vem da decisão mais nova para a mais antiga, e só a primeira de cada código vale.
 *
 * @example latestOutsideCodes([{ code: 'pao', outsideBusiness: true }]) // Set { 'pao' }
 */
export function latestOutsideCodes(decisions: OutsideDecision[]): Set<string> {
  const seen = new Set<string>();
  const outside = new Set<string>();
  for (const { code, outsideBusiness } of decisions) {
    if (seen.has(code)) continue;
    seen.add(code);
    if (outsideBusiness) outside.add(code);
  }
  return outside;
}

/**
 * As linhas da nota nova com código lembrado como de fora (todas as linhas do mesmo produto).
 *
 * @example suggestedOutsidePositions([{ position: 2, code: 'pao' }], new Set(['pao'])) // [2]
 */
export function suggestedOutsidePositions(
  items: { position: number; code: string }[],
  outsideCodes: Set<string>,
): number[] {
  return items
    .filter((item) => outsideCodes.has(item.code))
    .map((item) => item.position);
}
