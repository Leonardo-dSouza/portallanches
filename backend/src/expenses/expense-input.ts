import { BadRequestException } from '@nestjs/common';
import { parseMoney } from '../common/money.js';

const MAX_DESCRIPTION_LENGTH = 200;

/** Corpo de gasto já validado. */
export interface ExpenseInput {
  description: string;
  amount: string;
}

function parseDescription(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text.length > 0 && text.length <= MAX_DESCRIPTION_LENGTH) return text;
  throw new BadRequestException(
    `Campo "description" inválido: recebido ${JSON.stringify(raw)}, esperado texto de 1 a ${MAX_DESCRIPTION_LENGTH} caracteres`,
  );
}

/**
 * Valida o corpo de um gasto vindo da API.
 *
 * @example parseExpenseInput({ description: 'Gás', amount: 120 })
 */
export function parseExpenseInput(body: unknown): ExpenseInput {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException(
      `Corpo inválido: recebido ${JSON.stringify(body)}, esperado objeto JSON do gasto`,
    );
  }
  const fields = body as Record<string, unknown>;
  return {
    description: parseDescription(fields.description),
    amount: parseMoney(fields.amount, 'amount', false),
  };
}
