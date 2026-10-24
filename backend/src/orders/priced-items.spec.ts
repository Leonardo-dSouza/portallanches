import { FakeOrderCatalog } from './order-fakes.fixture.js';
import { priceItemsForDay } from './priced-items.js';

const line = (productId: number, quantity: number) => ({
  productId,
  quantity,
  note: null,
  addons: [],
});

describe('priceItemsForDay', () => {
  it('põe o preço do dia, ordena pela categoria e soma o que sai do estoque', async () => {
    const catalog = new FakeOrderCatalog();
    const items = [line(61, 2), line(9, 1)];

    const priced = await priceItemsForDay(catalog, items, '2026-09-22', []);

    expect(priced.items.map((i) => [i.productName, i.unitPrice])).toEqual([
      ['X Salada', '17.80'],
      ['Guaraná lata', '6.00'],
    ]);
    expect(priced.needs).toEqual([{ supplyId: 30, milli: 2000 }]);
    expect(catalog.pricedOn).toEqual(['2026-09-22']);
  });

  it('adicional em item sem categoria de adicionais é recusado', async () => {
    const catalog = new FakeOrderCatalog();
    const items = [
      { ...line(61, 1), addons: [{ productId: 33, quantity: 1 }] },
    ];

    await expect(
      priceItemsForDay(catalog, items, '2026-09-22', []),
    ).rejects.toThrow(/Guaraná lata" não aceita adicionais/);
  });
});
