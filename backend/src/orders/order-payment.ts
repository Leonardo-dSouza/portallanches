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

/** A forma e o meio escolhidos: no pedido ou no recebimento de fiado (2026-10-25). */
type PaymentChoice = Pick<OrderInput, 'paymentMethodId' | 'paymentMode'>;

/** Maquininha exige o meio (crédito, débito ou PIX) e as outras formas não aceitam meio. */
function assertPaymentMode(
  method: PaymentMethodEntry,
  input: PaymentChoice,
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
  input: PaymentChoice,
): Promise<PaymentMethodEntry | null> {
  if (input.paymentMethodId === null) return null;
  const method = await findActivePaymentMethod(catalog, input.paymentMethodId);
  assertPaymentMode(method, input);
  return method;
}

/** O que a regra do fiado olha no pedido. */
type FiadoFields = Pick<OrderInput, 'customerId' | 'fiadoDueDate'>;

/**
 * Fiado (2026-10-25): o pedido fica preso a um cliente; a previsão de pagamento só existe no
 * fiado e não pode ser antes da noite do pedido.
 *
 * @example assertFiado(fiado, { customerId: 7, fiadoDueDate: '2026-10-30' }, '2026-10-25') // ok
 */
export function assertFiado(
  method: PaymentMethodEntry | null,
  input: FiadoFields,
  businessDate: string,
): void {
  if (!method?.isFiado) return rejectDueDate(method, input.fiadoDueDate);
  if (input.customerId === null)
    throw new BadRequestException(
      `Forma de pagamento ${method.id} é fiado: esperado "customerId" do cliente que vai pagar depois`,
    );
  assertDueNotBefore(input.fiadoDueDate, businessDate);
}

/**
 * A previsão do fiado não pode ser antes da noite do pedido (no lançamento e ao remarcar).
 *
 * @example assertDueNotBefore('2026-10-20', '2026-10-25') // 422
 */
export function assertDueNotBefore(
  due: string | null,
  businessDate: string,
): void {
  if (due === null || due >= businessDate) return;
  throw new UnprocessableEntityException(
    `Previsão de pagamento ${due} é antes da noite do pedido ${businessDate}: esperado ${businessDate} ou depois`,
  );
}

function rejectDueDate(
  method: PaymentMethodEntry | null,
  fiadoDueDate: string | null,
): void {
  if (fiadoDueDate === null) return;
  throw new BadRequestException(
    `"fiadoDueDate" só vale para fiado: a forma ${method?.id ?? 'aberta'} não é fiado`,
  );
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
