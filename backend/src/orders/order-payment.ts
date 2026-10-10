import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toCents } from '../common/money.js';
import type { OrderInput } from './order-input.js';
import type { OrderCatalog, PaymentMethodEntry } from './order-repository.js';

async function findActivePaymentMethod(
  catalog: OrderCatalog,
  id: number,
): Promise<PaymentMethodEntry> {
  const method = await catalog.findPaymentMethod(id);
  if (method?.active) return method;
  throw new BadRequestException(
    `Forma de pagamento ${id} inexistente ou inativa: esperado id de uma forma ativa em payment_methods`,
  );
}

/** Maquininha exige o meio (crédito, débito ou PIX) e as outras formas não aceitam meio. */
function assertPaymentMode(
  method: PaymentMethodEntry,
  input: OrderInput,
): void {
  if (method.isCardTerminal === (input.paymentMode !== null)) return;
  const mode = JSON.stringify(input.paymentMode);
  throw new BadRequestException(
    method.isCardTerminal
      ? `Forma de pagamento ${method.id} é maquininha: esperado "paymentMode" CREDIT, DEBIT ou PIX, recebido ${mode}`
      : `Forma de pagamento ${method.id} não é maquininha: esperado omitir "paymentMode", recebido ${mode}`,
  );
}

/**
 * A forma de pagamento do pedido, já conferida (ativa, e o meio só na maquininha); null =
 * conta aberta no balcão.
 *
 * @example await resolvePaymentMethod(catalog, input) // { id: 1, isCash: true, … }
 */
export async function resolvePaymentMethod(
  catalog: OrderCatalog,
  input: OrderInput,
): Promise<PaymentMethodEntry | null> {
  if (input.paymentMethodId === null) return null;
  const method = await findActivePaymentMethod(catalog, input.paymentMethodId);
  assertPaymentMode(method, input);
  return method;
}

/**
 * "Troco para" (2026-10-10): só na forma marcada como dinheiro e nunca abaixo do total.
 *
 * @example assertChangeFor('50.00', dinheiro, '38.60') // ok
 */
export function assertChangeFor(
  changeFor: string | null,
  method: PaymentMethodEntry | null,
  amount: string,
): void {
  if (changeFor === null) return;
  if (!method?.isCash)
    throw new UnprocessableEntityException(
      `"changeFor" só vale para dinheiro: a forma ${method?.id ?? 'aberta'} não é dinheiro`,
    );
  if (toCents(changeFor) >= toCents(amount)) return;
  throw new UnprocessableEntityException(
    `Troco para ${changeFor} é menor que o total ${amount}: esperado valor maior ou igual ao total`,
  );
}
