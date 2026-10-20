/**
 * Raiz do CNPJ (8 primeiros números): o mercado é a empresa, igual em todas as filiais.
 *
 * @example cnpjRootOf('06057223058250') // '06057223'
 */
export function cnpjRootOf(cnpj: string): string {
  return cnpj.slice(0, 8);
}

/**
 * Nome do mercado nas telas: o apelido dado em Compras ou, sem ele, a razão social da nota.
 *
 * @example vendorDisplayName({ nickname: 'Assaí', legalName: 'SENDAS DISTRIBUIDORA S/A' }) // 'Assaí'
 */
export function vendorDisplayName(vendor: {
  nickname: string | null;
  legalName: string;
}): string {
  return vendor.nickname ?? vendor.legalName;
}
