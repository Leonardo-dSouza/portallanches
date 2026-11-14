// A nota é de SP: a emissão aparece no horário de Brasília, mesmo num navegador em outro fuso.
const ISSUED_AT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const SEFAZ_SP_QUERY_URL =
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';

/**
 * Data e hora da emissão da nota.
 *
 * @example formatIssuedAt('2026-10-18T20:14:11.000Z') // '18/10/2026 17:14'
 */
export function formatIssuedAt(issuedAt: string): string {
  return ISSUED_AT.format(new Date(issuedAt)).replace(', ', ' ');
}

/**
 * Dia e mês da emissão da nota no fuso de SP.
 *
 * @example formatDayMonth('2026-10-30T14:20:00.000Z') // '30/10'
 */
export function formatDayMonth(issuedAt: string): string {
  return formatIssuedAt(issuedAt).slice(0, 5);
}

/**
 * CNPJ com a máscara de sempre; o que não tiver 14 números fica como veio.
 *
 * @example formatCnpj('06057223058250') // '06.057.223/0582-50'
 */
export function formatCnpj(cnpj: string): string {
  const parts = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/.exec(cnpj);
  if (!parts) return cnpj;
  const [, a, b, c, branch, digits] = parts;
  return `${a}.${b}.${c}/${branch}-${digits}`;
}

/**
 * Raiz do CNPJ (os 8 primeiros números, a empresa) com os pontos.
 *
 * @example formatCnpjRoot('06057223') // '06.057.223'
 */
export function formatCnpjRoot(root: string): string {
  return root.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
}

/**
 * Página da nota na consulta pública da SEFAZ-SP, para conferir o original.
 *
 * @example sefazInvoiceUrl('3526…') // 'https://www.nfce.fazenda.sp.gov.br/…?p=3526…|3|1'
 */
export function sefazInvoiceUrl(accessKey: string): string {
  return `${SEFAZ_SP_QUERY_URL}?p=${accessKey}|3|1`;
}

/** @example itemCountLabel(20) // '20 itens' */
export function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}

/**
 * Os itens da nota e, se houver, quantos ficaram fora da lanchonete (2026-10-25).
 *
 * @example invoiceItemsLabel(20, 3) // '20 itens · 3 fora'
 */
export function invoiceItemsLabel(count: number, outside: number): string {
  const items = itemCountLabel(count);
  return outside > 0 ? `${items} · ${outside} fora` : items;
}

/**
 * Diferença do preço pago sobre a base, com sinal e vírgula; sem base na data, "sem base".
 *
 * @example formatBaseDiff('2.2') // '+2,2%'
 */
export function formatBaseDiff(diffPercent: string | null): string {
  if (diffPercent === null) return 'sem base';
  const text = `${diffPercent.replace('.', ',')}%`;
  if (diffPercent.startsWith('-') || diffPercent === '0.0') return text;
  return `+${text}`;
}

/**
 * Cor da diferença sobre a base: vermelho acima, verde abaixo, neutro sem base na data.
 *
 * @example baseDiffTone({ diffPercent: '2.2', above: true }) // 'danger'
 */
export function baseDiffTone(price: {
  diffPercent: string | null;
  above: boolean;
}): 'danger' | 'success' | 'muted' {
  if (price.diffPercent === null) return 'muted';
  return price.above ? 'danger' : 'success';
}

/** Classes inteiras por tom (o Tailwind só gera classe que aparece inteira no código). */
export const BASE_DIFF_TEXT_CLASS = {
  danger: 'text-danger font-semibold',
  success: 'text-success font-semibold',
  muted: 'text-muted',
} as const;

export const BASE_DIFF_TAG_CLASS = {
  danger: 'tag tag-danger text-xs ml-1.5',
  success: 'tag tag-success text-xs ml-1.5',
  muted: 'tag tag-muted text-xs ml-1.5',
} as const;
