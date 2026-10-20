import { BadRequestException } from '@nestjs/common';

const SAO_PAULO_UF = '35';
const NFCE_MODEL = '65';
const KEY_PATTERN = /^\d{44}$/;
// O servidor nunca busca a URL colada: dela sai só o `p`, e só com dígitos, letras e "|".
const QUERY_PARAM_PATTERN = /^\d{44}(\|[0-9A-Za-z]+){1,8}$/;

/** Nota pronta para consultar: a chave e o `p` que vai para a SEFAZ-SP. */
export interface NfceCode {
  accessKey: string;
  queryParam: string;
}

/**
 * Lê o link do QR Code, a chave digitada (com ou sem espaço) ou o que o leitor USB digitou,
 * e confere a chave (44 números, NFC-e de SP, dígito verificador) antes de qualquer consulta.
 *
 * @example parseNfceCode('3526 1011 …') // { accessKey: '3526…', queryParam: '3526…|3|1' }
 */
export function parseNfceCode(input: string): NfceCode {
  const text = input.trim();
  const queryParam = text.includes('p=')
    ? readQueryParam(text)
    : `${text.replace(/\s+/g, '')}|3|1`;
  const accessKey = queryParam.split('|')[0];
  assertNfceKey(accessKey, text);
  return { accessKey, queryParam };
}

function readQueryParam(link: string): string {
  const raw = link.slice(link.indexOf('p=') + 2).split('&')[0];
  const param = decodePipes(raw);
  if (QUERY_PARAM_PATTERN.test(param)) return param;
  throw invalidCode(link);
}

function decodePipes(raw: string): string {
  return raw.replace(/%7C/gi, '|');
}

function assertNfceKey(key: string, input: string): void {
  if (!KEY_PATTERN.test(key)) throw invalidCode(input);
  const uf = key.slice(0, 2);
  if (uf !== SAO_PAULO_UF)
    throw new BadRequestException(
      `Nota de outro estado (UF ${uf}, chave ${key}): só lemos NFC-e de SP (chave começando com ${SAO_PAULO_UF})`,
    );
  const model = key.slice(20, 22);
  if (model !== NFCE_MODEL)
    throw new BadRequestException(
      `Chave ${key} é do modelo ${model}: só lemos NFC-e (modelo ${NFCE_MODEL}), o cupom do consumidor`,
    );
  if (checkDigit(key.slice(0, 43)) !== Number(key[43]))
    throw new BadRequestException(
      `Chave ${key} com dígito verificador errado: confira os 44 números`,
    );
}

/** Módulo 11 da chave da NF-e: pesos de 2 a 9 da direita para a esquerda. */
function checkDigit(first43: string): number {
  const sum = first43
    .split('')
    .reverse()
    .reduce(
      (total, digit, index) => total + Number(digit) * (2 + (index % 8)),
      0,
    );
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function invalidCode(input: string): BadRequestException {
  return new BadRequestException(
    `Nota fiscal inválida: recebido ${JSON.stringify(input)}, esperado o link do QR Code ou a chave de 44 números`,
  );
}
