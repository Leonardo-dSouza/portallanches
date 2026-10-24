import type { DeliveryZone, PaymentMethod } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import {
  changedReceipt,
  fullReceipt,
  staffConsumptionReceipt,
} from './receipt-model';
import { DEFAULT_TICKET_SETTINGS } from './ticket-settings';

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
const DAY = {
  paymentMethods: [DINHEIRO],
  zones: [CENTRO],
  ticket: DEFAULT_TICKET_SETTINGS,
};
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
    expect(receipt.items[0]).toMatchObject({
      title: '2 X Salada',
      total: '35.60',
    });
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
      payment: ['A PAGAR: paga no fim'],
    });
  });
});

describe('changedReceipt (2026-10-15, no lugar da ADIÇÃO)', () => {
  const COCA = {
    ...storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00')),
    productId: 60,
  };
  const THREE = storedItem(storedLine('X Salada', 'Tradicional', 3, '17.80'));

  it('a comanda inteira, com o que é novo marcado e o que saiu no fim', () => {
    const receipt = changedReceipt(
      orderFixture({ dayNumber: 7, items: [THREE] }),
      [SALADA, COCA],
      DAY,
    );
    expect(receipt).toMatchObject({ kind: 'changed', number: '#7' });
    expect(receipt.items.map((item) => [item.title, item.newMark])).toEqual([
      ['3 X Salada', '+1 NOVO'],
    ]);
    expect(receipt.removed.map((item) => item.title)).toEqual([
      '1 Coca Cola 600ml',
    ]);
    expect(receipt.totals.length).toBeGreaterThan(0);
  });

  it('linha inteira nova sai "NOVO"', () => {
    const receipt = changedReceipt(
      orderFixture({ items: [SALADA, COCA] }),
      [SALADA],
      DAY,
    );
    expect(receipt.items.map((item) => item.newMark)).toEqual([
      undefined,
      'NOVO',
    ]);
    expect(receipt.removed).toEqual([]);
  });
});

describe('staffConsumptionReceipt', () => {
  it('consumo interno: marcado, para quem, os itens sem preço e sem totais nem pagamento', () => {
    const receipt = staffConsumptionReceipt(
      {
        id: 40,
        closingId: 10,
        createdById: 2,
        createdAt: '2026-09-22T23:30:00.000Z',
        consumerName: 'Bianca',
        items: [SALADA],
        cmvTotal: '7.00',
        missingCostCount: 0,
      },
      DEFAULT_TICKET_SETTINGS,
    );
    expect(receipt).toMatchObject({
      kind: 'staff',
      number: '',
      time: '20:30',
      kindLabel: 'Sem cobrança',
      name: 'Bianca',
      address: [],
      totals: [],
      payment: [],
      removed: [],
      showPrices: false,
    });
    expect(receipt.items.map((item) => item.title)).toEqual(['2 X Salada']);
  });

  it('o pedido continua com os preços', () => {
    expect(fullReceipt(orderFixture({ items: [SALADA] }), DAY).showPrices).toBe(
      true,
    );
  });
});
