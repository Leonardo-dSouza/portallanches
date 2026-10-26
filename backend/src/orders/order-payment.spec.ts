import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertFiado } from './order-payment.js';
import type { PaymentMethodEntry } from './order-repository.js';

const PLAIN: PaymentMethodEntry = {
  id: 1,
  active: true,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
};
const FIADO: PaymentMethodEntry = { ...PLAIN, id: 4, isFiado: true };
const NIGHT = '2026-09-22';

// Fiado (pedido do usuário, 2026-10-25): preso a um cliente, com a previsão opcional.
describe('assertFiado', () => {
  it('fiado com cliente, com ou sem previsão, passa', () => {
    expect(() =>
      assertFiado(FIADO, { customerId: 7, fiadoDueDate: null }, NIGHT),
    ).not.toThrow();
    expect(() =>
      assertFiado(FIADO, { customerId: 7, fiadoDueDate: NIGHT }, NIGHT),
    ).not.toThrow();
  });

  it('fiado sem cliente é recusado citando a forma', () => {
    expect(() =>
      assertFiado(FIADO, { customerId: null, fiadoDueDate: null }, NIGHT),
    ).toThrow(BadRequestException);
    expect(() =>
      assertFiado(FIADO, { customerId: null, fiadoDueDate: null }, NIGHT),
    ).toThrow(/Forma de pagamento 4 é fiado: esperado "customerId"/);
  });

  it('previsão sem fiado é recusada (nem na conta aberta)', () => {
    const input = { customerId: null, fiadoDueDate: '2026-09-30' };
    expect(() => assertFiado(PLAIN, input, NIGHT)).toThrow(
      /"fiadoDueDate" só vale para fiado: a forma 1 não é fiado/,
    );
    expect(() => assertFiado(null, input, NIGHT)).toThrow(/a forma aberta/);
  });

  it('previsão antes da noite do pedido é recusada com as duas datas', () => {
    const input = { customerId: 7, fiadoDueDate: '2026-09-21' };
    expect(() => assertFiado(FIADO, input, NIGHT)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertFiado(FIADO, input, NIGHT)).toThrow(
      'Previsão de pagamento 2026-09-21 é antes da noite do pedido 2026-09-22: esperado 2026-09-22 ou depois',
    );
  });
});
