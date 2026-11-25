import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertFiado, assertPrepaid } from './order-payment.js';
import type { PaymentMethodEntry } from './order-repository.js';

const PLAIN: PaymentMethodEntry = {
  id: 1,
  active: true,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
  isIfood: false,
};
const CASH: PaymentMethodEntry = { ...PLAIN, id: 2, isCash: true };
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

describe('assertPrepaid', () => {
  const parts = [
    { paymentMethodId: 1, amount: '20.00', paymentMode: null },
    { paymentMethodId: 2, amount: '30.00', paymentMode: null },
  ];

  it('recusa fiado, pagamento dividido e troco com prepaid: true', () => {
    expect(() =>
      assertPrepaid(true, FIADO, { paymentParts: [], changeFor: null }),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      assertPrepaid(true, FIADO, { paymentParts: [], changeFor: null }),
    ).toThrow(/fiado.*4/);

    expect(() =>
      assertPrepaid(true, PLAIN, { paymentParts: parts, changeFor: null }),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      assertPrepaid(true, PLAIN, { paymentParts: parts, changeFor: null }),
    ).toThrow(/2 partes/);

    expect(() =>
      assertPrepaid(true, CASH, { paymentParts: [], changeFor: '50.00' }),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      assertPrepaid(true, CASH, { paymentParts: [], changeFor: '50.00' }),
    ).toThrow(/50\.00/);
  });

  it('permite forma única sem troco e prepaid: false com qualquer forma', () => {
    expect(() =>
      assertPrepaid(true, PLAIN, { paymentParts: [], changeFor: null }),
    ).not.toThrow();
    expect(() =>
      assertPrepaid(true, CASH, { paymentParts: [], changeFor: null }),
    ).not.toThrow();
    expect(() =>
      assertPrepaid(false, FIADO, { paymentParts: [], changeFor: null }),
    ).not.toThrow();
    expect(() =>
      assertPrepaid(false, CASH, { paymentParts: [], changeFor: '50.00' }),
    ).not.toThrow();
    expect(() =>
      assertPrepaid(false, PLAIN, { paymentParts: parts, changeFor: null }),
    ).not.toThrow();
  });
});
