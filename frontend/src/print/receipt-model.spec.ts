import type { DeliveryZone, PaymentMethod } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { additionReceipt, fullReceipt } from './receipt-model';

const DINHEIRO: PaymentMethod = {
  id: 2,
  name: 'Dinheiro',
  active: true,
  sortOrder: 0,
  isCardTerminal: false,
  isCash: true,
};
const CENTRO: DeliveryZone = {
  id: 7,
  neighborhood: 'Centro',
  neighborhoodKey: 'centro',
  fee: '5.00',
  active: true,
};
const DAY = { paymentMethods: [DINHEIRO], zones: [CENTRO] };
const SALADA = storedItem(storedLine('X Salada', 'Tradicional', 2, '17.80'));

describe('fullReceipt', () => {
  it('entrega: número, hora, cliente com endereço, itens, totais e o troco', () => {
    const receipt = fullReceipt(
      orderFixture({
        dayNumber: 12,
        type: 'DELIVERY',
        items: [SALADA],
        amount: '40.60',
        deliveryFee: '5.00',
        deliveryZoneId: 7,
        paymentMethodId: 2,
        changeFor: '50.00',
        customerName: 'Ana',
        customerPhone: '79999991234',
        customerStreet: 'Rua A',
        customerNumber: '123',
        customerReference: 'casa azul',
      }),
      DAY,
    );
    expect(receipt).toMatchObject({
      kind: 'full',
      number: '#12',
      time: '20:41',
      kindLabel: 'Entrega',
      name: 'Ana',
      address: ['79999991234', 'Rua A, 123', 'Ref.: casa azul', 'Centro'],
      totals: [
        { label: 'Itens', value: 'R$ 35,60' },
        { label: 'Taxa', value: 'R$ 5,00' },
        { label: 'Total', value: 'R$ 40,60' },
      ],
      payment: ['Dinheiro', 'Troco para R$ 50,00 (levar R$ 9,40)'],
    });
    expect(receipt.rows[0]).toMatchObject({ quantity: 2, total: '35.60' });
  });

  it('conta aberta no balcão: o nome e o aviso no lugar da forma', () => {
    const receipt = fullReceipt(
      orderFixture({ paymentMethodId: null, customerName: 'Maria' }),
      DAY,
    );
    expect(receipt).toMatchObject({
      kindLabel: 'Balcão',
      name: 'Maria',
      address: [],
      totals: [{ label: 'Total', value: 'R$ 20,00' }],
      payment: ['ABERTO: paga no fim'],
    });
  });
});

describe('additionReceipt', () => {
  it('só os itens acrescentados, sem totais nem pagamento', () => {
    const receipt = additionReceipt(
      orderFixture({ dayNumber: 7, customerName: 'Maria' }),
      [SALADA],
    );
    expect(receipt).toMatchObject({
      kind: 'addition',
      number: '#7',
      name: 'Maria',
      totals: [],
      payment: [],
    });
    expect(receipt.rows).toHaveLength(1);
  });
});
