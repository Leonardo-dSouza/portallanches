/** Produto do Cardápio que é o próprio insumo vendido (bebida: 1 un do insumo, nada mais). */
export interface SaleProductRecord {
  id: number;
  /** Nome no Cardápio ("Add ovo"), para a tela dizer onde o preço é gravado. */
  name: string;
  /** Com 2 casas ('7.00'); null = ainda sem preço. */
  salePrice: string | null;
  /** 'bebidas' etc.: a reimportação dessa planilha sobrescreve o preço editado na tela. */
  importSource: string | null;
}

/** Produto que usa o insumo, como o banco devolve para decidir se é 1:1. */
export interface SaleProductCandidate extends SaleProductRecord {
  active: boolean;
  /** Quantidade do insumo no produto, na unidade de contagem ('1'). */
  quantity: string;
  /** Quantos insumos o produto tem na composição. */
  componentCount: number;
}

/**
 * O produto 1:1 do insumo: ativo, com só este insumo e quantidade 1. Lanche (vários
 * insumos) ou porção (0,036 kg) não conta. Dois candidatos = ambíguo, fica sem.
 *
 * @example pickSaleProduct([{ id: 9, name: 'Coca Cola 2l', salePrice: '7.00', importSource: 'bebidas', active: true, quantity: '1', componentCount: 1 }])?.id // 9
 */
export function pickSaleProduct(
  candidates: SaleProductCandidate[],
): SaleProductRecord | null {
  const matches = candidates.filter(
    (c) => c.active && c.componentCount === 1 && Number(c.quantity) === 1,
  );
  if (matches.length !== 1) return null;
  const { id, name, salePrice, importSource } = matches[0];
  return { id, name, salePrice, importSource };
}
