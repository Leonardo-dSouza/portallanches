/** Códigos e fornecedores das ligações item×insumo, sem repetição, para o filtro `IN` das notas. */
export interface LinkedItemKeys {
  codes: string[];
  vendorIds: number[];
}

/**
 * Códigos e fornecedores únicos das ligações, para o `IN` (2026-11-23: o OR com uma entrada por ligação
 * levava o Postgres da produção ao teto de 768 MB). O `IN` deixa passar o código ligado só em outro
 * fornecedor; quem consulta casa fornecedor|código no JS.
 *
 * @example linkedItemKeys([{ vendorId: 1, code: '100' }, { vendorId: 2, code: '100' }])
 *   // { codes: ['100'], vendorIds: [1, 2] }
 */
export function linkedItemKeys(
  links: readonly { vendorId: number; code: string }[],
): LinkedItemKeys {
  return {
    codes: [...new Set(links.map((link) => link.code))],
    vendorIds: [...new Set(links.map((link) => link.vendorId))],
  };
}
