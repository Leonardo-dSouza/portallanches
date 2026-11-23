import { BadRequestException } from '@nestjs/common';
import { parseOrderInput } from './order-input.js';

const ITEMS = [{ productId: 9, quantity: 1 }];
const IFOOD = { items: ITEMS, type: 'IFOOD' };

/** Pedido do iFood (2026-11-23): só itens, o nome do cliente do app e o nº do pedido. */
describe('parseOrderInput: iFood', () => {
  it('aceita o nome e o nº, sem forma escolhida (o service põe a do iFood)', () => {
    const input = parseOrderInput({
      ...IFOOD,
      counterName: ' Mariana ',
      ifoodCode: ' 4821 ',
    });
    expect(input).toMatchObject({
      type: 'IFOOD',
      paymentMethodId: null,
      paymentParts: [],
      customerId: null,
      diningOption: null,
      counterName: 'Mariana',
      ifoodCode: '4821',
    });
  });

  it('nome e nº em branco viram null', () => {
    const input = parseOrderInput({
      ...IFOOD,
      counterName: ' ',
      ifoodCode: '',
    });
    expect([input.counterName, input.ifoodCode]).toEqual([null, null]);
  });

  it.each([
    ['paymentMethodId', 1],
    ['paymentMode', 'PIX'],
    ['customerId', 5],
    ['deliveryFee', '3.00'],
    ['changeFor', '50.00'],
    ['diningOption', 'EAT_IN'],
    ['fiadoDueDate', '2026-11-30'],
  ])(
    'recusa "%s": o iFood não tem pagamento, entrega nem consumo',
    (field, value) => {
      expect(() => parseOrderInput({ ...IFOOD, [field]: value })).toThrow(
        `Pedido do iFood (IFOOD) não aceita "${field}"`,
      );
    },
  );

  it('recusa nº do iFood com mais de 10 caracteres', () => {
    expect(() =>
      parseOrderInput({ ...IFOOD, ifoodCode: '12345678901' }),
    ).toThrow(BadRequestException);
  });

  it('balcão e entrega recusam o nº do iFood', () => {
    const counter = { items: ITEMS, type: 'COUNTER', paymentMethodId: 1 };
    expect(() => parseOrderInput({ ...counter, ifoodCode: '4821' })).toThrow(
      'Pedido COUNTER não aceita "ifoodCode"',
    );
  });

  it('tipo desconhecido diz os três aceitos', () => {
    expect(() => parseOrderInput({ ...IFOOD, type: 'RAPPI' })).toThrow(
      '"DELIVERY" ou "COUNTER" ou "IFOOD"',
    );
  });
});
