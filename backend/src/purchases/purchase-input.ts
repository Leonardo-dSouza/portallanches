import { BadRequestException } from '@nestjs/common';
import { parseObject, parsePositionList } from '../common/input-parsers.js';
import { parseDateRange, shiftBusinessDate } from '../closing/business-date.js';
import type { IssuedRange } from './purchase-records.js';

// A nota é de SP, sem horário de verão desde 2019: o dia da emissão começa às 00:00 -03:00.
const SAO_PAULO_OFFSET = '-03:00';
const MAX_CODE_LENGTH = 60;
const MAX_NICKNAME_LENGTH = 60;

const startOfDay = (businessDate: string): Date =>
  new Date(`${businessDate}T00:00:00${SAO_PAULO_OFFSET}`);

/**
 * Período de Compras pela data de emissão da nota (YYYY-MM-DD, máx. 366 dias) em instantes.
 *
 * @example parseIssuedRange('2026-10-01', '2026-10-18').until // 2026-10-19T03:00:00Z
 */
export function parseIssuedRange(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): IssuedRange {
  const { from, to } = parseDateRange(rawFrom, rawTo);
  return {
    from: startOfDay(from),
    until: startOfDay(shiftBusinessDate(to, 1)),
  };
}

/**
 * Produto de um mercado vindo da query (`?vendorId=3&code=1128810`).
 *
 * @example parseProductQuery('3', '1128810') // { vendorId: 3, code: '1128810' }
 */
export function parseProductQuery(
  rawVendorId: string | undefined,
  rawCode: string | undefined,
): { vendorId: number; code: string } {
  const vendorId = Number(rawVendorId);
  if (!/^\d+$/.test(rawVendorId ?? '') || vendorId <= 0)
    throw new BadRequestException(
      `Campo "vendorId" inválido: recebido ${JSON.stringify(rawVendorId)}, esperado inteiro positivo`,
    );
  const code = (rawCode ?? '').trim();
  if (!code || code.length > MAX_CODE_LENGTH)
    throw new BadRequestException(
      `Campo "code" inválido: recebido ${JSON.stringify(rawCode)}, esperado o código do produto (1 a ${MAX_CODE_LENGTH} caracteres)`,
    );
  return { vendorId, code };
}

/**
 * Apelido do mercado (`{ nickname }`); vazio ou null tira o apelido.
 *
 * @example parseVendorNickname({ nickname: ' Assaí ' }) // 'Assaí'
 */
export function parseVendorNickname(body: unknown): string | null {
  const { nickname } = parseObject(body, 'apelido do mercado');
  if (nickname === null) return null;
  const text = typeof nickname === 'string' ? nickname.trim() : null;
  if (text === '') return null;
  if (text !== null && text.length <= MAX_NICKNAME_LENGTH) return text;
  throw new BadRequestException(
    `Campo "nickname" inválido: recebido ${JSON.stringify(nickname)}, esperado texto de até ${MAX_NICKNAME_LENGTH} caracteres ou null`,
  );
}

/**
 * Itens da nota fora da lanchonete, marcados em Compras (`{ positions: [9, 10] }`; vazio
 * desmarca todos).
 *
 * @example parseOutsideItems({ positions: [9, 10] }) // [9, 10]
 */
export function parseOutsideItems(body: unknown): number[] {
  const { positions } = parseObject(body, 'itens fora da lanchonete');
  return parsePositionList(positions, 'positions');
}
