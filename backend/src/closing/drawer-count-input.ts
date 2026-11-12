import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import type { DrawerToCountItem } from '../report/drawer-check.js';

export interface DrawerCountItemInput {
  paymentMethodId: number;
  amount: string;
}

export interface DrawerCountInput {
  counts: DrawerCountItemInput[];
  note: string | null;
}

export interface KnownPaymentMethod {
  id: number;
  name: string;
  isFiado: boolean;
}

const MAX_NOTE_LENGTH = 500;

function parseNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw new BadRequestException(
      `Campo "note" inválido: recebido ${JSON.stringify(raw)}, esperado texto de até ${MAX_NOTE_LENGTH} caracteres`,
    );
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return parseText(raw, 'note', MAX_NOTE_LENGTH);
}

function parseCountItem(raw: unknown, index: number): DrawerCountItemInput {
  const fields = parseObject(raw, `contagem na posição ${index}`);
  const paymentMethodId = parseId(
    fields.paymentMethodId,
    `counts[${index}].paymentMethodId`,
  );
  const amount = parseMoney(fields.amount, `counts[${index}].amount`, true);
  return { paymentMethodId, amount };
}

function assertNoDuplicates(counts: DrawerCountItemInput[]): void {
  const seen = new Set<number>();
  for (const item of counts) {
    if (seen.has(item.paymentMethodId)) {
      throw new BadRequestException(
        `Forma de pagamento repetida na contagem: ${item.paymentMethodId}, esperado cada forma uma vez só`,
      );
    }
    seen.add(item.paymentMethodId);
  }
}

/**
 * Valida e converte o corpo de contagem da gaveta ({ counts, note? }).
 *
 * @example parseDrawerCountInput({ counts: [{ paymentMethodId: 1, amount: '30.00' }] })
 */
export function parseDrawerCountInput(body: unknown): DrawerCountInput {
  const fields = parseObject(
    body,
    'fechamento com contagem ({ counts, note? })',
  );
  if (!Array.isArray(fields.counts)) {
    throw new BadRequestException(
      `Campo "counts" inválido: recebido ${JSON.stringify(fields.counts)}, esperado lista de contagens`,
    );
  }
  const counts = fields.counts.map(parseCountItem);
  assertNoDuplicates(counts);
  const note = parseNote(fields.note);
  return { counts, note };
}

function assertNoForbiddenMethods(
  counts: DrawerCountItemInput[],
  toCount: DrawerToCountItem[],
  knownMethods: KnownPaymentMethod[],
): void {
  const toCountIds = new Set(toCount.map((item) => item.paymentMethodId));
  const methodMap = new Map(knownMethods.map((m) => [m.id, m]));
  for (const count of counts) {
    const method = methodMap.get(count.paymentMethodId);
    if (!method) {
      throw new BadRequestException(
        `Forma de pagamento inexistente na contagem: ${count.paymentMethodId}`,
      );
    }
    if (method.isFiado) {
      throw new BadRequestException(
        `Forma de pagamento fiado não pode ser contada: ${method.name} (${method.id})`,
      );
    }
    if (!toCountIds.has(count.paymentMethodId)) {
      throw new BadRequestException(
        `Forma de pagamento fora da conferência: ${method.name} (${method.id})`,
      );
    }
  }
}

/**
 * Confere se a contagem tem exatamente as formas de toCount (nem a mais, nem a menos, nem fiado).
 *
 * @example assertValidDrawerCounts(counts, toCount, allMethods)
 */
export function assertValidDrawerCounts(
  counts: DrawerCountItemInput[],
  toCount: DrawerToCountItem[],
  knownMethods: KnownPaymentMethod[],
): void {
  assertNoForbiddenMethods(counts, toCount, knownMethods);
  const countedIds = new Set(counts.map((c) => c.paymentMethodId));
  const missing = toCount.filter(
    (item) => !countedIds.has(item.paymentMethodId),
  );
  if (missing.length > 0) {
    throw new BadRequestException(
      `Falta a contagem de: ${missing.map((m) => m.name).join(', ')}`,
    );
  }
}
