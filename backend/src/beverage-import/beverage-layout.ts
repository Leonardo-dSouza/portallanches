/** Faixa de linhas da planilha de bebidas que vira uma categoria do cardápio. */
export interface BeverageBlock {
  /** Linhas do Excel (a partir de 1), inclusivas: `'4-24'`. Linhas sem nome são puladas. */
  rows: string;
  category: string;
  /** Nome da embalagem de compra no estoque (`Fardo` de 12, `Engradado` de 24). */
  packageName: string;
}

export interface BeverageLayout {
  sheet: string;
  blocks: BeverageBlock[];
  /**
   * Linha que vira vários produtos com o mesmo custo e preço, cada um com estoque próprio.
   * Chave = nome da planilha normalizado (`toNeighborhoodKey`); valor = nomes no cardápio.
   */
  splits: Record<string, string[]>;
}

/**
 * Layout de `Bebidas.xlsx` (recebida em 2026-09-30): aba `Plan1`, colunas B nome, C qtd da
 * embalagem, D custo da embalagem, E custo un, F venda. Um bloco por categoria (decisão do
 * usuário, sessão 7).
 */
export const BEVERAGE_LAYOUT: BeverageLayout = {
  sheet: 'Plan1',
  blocks: [
    { rows: '4-24', category: 'Refrigerantes', packageName: 'Fardo' },
    { rows: '29-33', category: 'Cervejas', packageName: 'Fardo' },
    { rows: '40-50', category: 'Retornáveis', packageName: 'Engradado' },
  ],
  // A planilha tem um "It sabores"; o balcão vende e conta cada sabor (pedido do usuário, sessão 7).
  splits: {
    'it sabores 2l': ['It Limão 2L', 'It Laranja 2L', 'It Guaraná 2L'],
  },
};

export const BEVERAGE_COLUMNS = {
  name: 'B',
  packageQuantity: 'C',
  packageCost: 'D',
  unitCost: 'E',
  salePrice: 'F',
} as const;
