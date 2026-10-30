const SEFAZ_QUERY_URL =
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';
const KEY_PATTERN = /^\d{44}$/;
// Mesma regra do backend (`nfce-access-key.ts`): do link colado sai só o `p`.
const QUERY_PARAM_PATTERN = /^\d{44}(\|[0-9A-Za-z]+){1,8}$/;

function queryParamOf(text: string): string | null {
  if (!text.includes('p=')) {
    const key = text.replace(/\s+/g, '');
    return KEY_PATTERN.test(key) ? `${key}|3|1` : null;
  }
  const raw = text.slice(text.indexOf('p=') + 2).split('&')[0];
  const param = raw.replace(/%7C/gi, '|');
  return QUERY_PARAM_PATTERN.test(param) ? param : null;
}

/**
 * Link da nota na consulta da SEFAZ-SP, para o caixa abrir no navegador e salvar a página (a
 * SEFAZ recusa o servidor desde 2026-10-30). O host é fixo: o link colado nunca é reaberto.
 *
 * @example sefazLinkOf('3526…') // 'https://www.nfce.fazenda.sp.gov.br/…?p=3526…|3|1'
 */
export function sefazLinkOf(typed: string): string | null {
  const param = queryParamOf(typed.trim());
  return param && `${SEFAZ_QUERY_URL}?p=${param}`;
}
