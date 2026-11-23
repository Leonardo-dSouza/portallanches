import { CAIXA, build, COUNTER } from './order-fakes.fixture.js';
import { orderView } from './order-view.js';

/** Forma do iFood nos fakes (`FakeOrderCatalog`). */
const IFOOD_METHOD = 8;

const IFOOD = {
  items: [{ productId: 9, quantity: 2 }],
  type: 'IFOOD',
  counterName: 'Mariana',
  ifoodCode: '4821',
};

/** X Salada (9) custa 17,80 no balcão e 24,90 no iFood. */
function buildWithIfoodPrice() {
  const built = build();
  const [xSalada, ...rest] = built.catalog.products;
  built.catalog.products = [{ ...xSalada, ifoodPrice: '24.90' }, ...rest];
  return built;
}

/** Pedido do iFood (2026-11-23): preço do app, forma do iFood e comissão da época. */
describe('OrderService: iFood', () => {
  it('grava a forma do iFood, o preço iFood, o nº e o nome', async () => {
    const { service } = buildWithIfoodPrice();
    const order = await service.create(CAIXA, IFOOD);
    expect(order).toMatchObject({
      type: 'IFOOD',
      paymentMethodId: IFOOD_METHOD,
      amount: '49.80',
      ifoodCode: '4821',
      customerName: 'Mariana',
      deliveryFee: '0.00',
      status: 'PREPARING',
    });
  });

  it('copia a comissão das configurações no pedido', async () => {
    const { service, catalog, orders } = buildWithIfoodPrice();
    catalog.ifoodCommissionPercent = '27.5';
    const order = await service.create(CAIXA, IFOOD);
    expect((await orders.findById(order.id))?.ifoodCommissionPercent).toBe(
      '27.5',
    );
  });

  it('a resposta da API não leva a comissão (só o relatório do admin)', async () => {
    const { service } = buildWithIfoodPrice();
    const created = await service.create(CAIXA, IFOOD);
    const view = orderView(created);
    expect(view).not.toHaveProperty('ifoodCommissionPercent');
    expect(view).toHaveProperty('ifoodCode', '4821');
  });

  it('editar guarda a comissão da época', async () => {
    const { service, catalog, orders } = buildWithIfoodPrice();
    const created = await service.create(CAIXA, IFOOD);
    catalog.ifoodCommissionPercent = '30';
    await service.replace(CAIXA, created.id, IFOOD);
    expect((await orders.findById(created.id))?.ifoodCommissionPercent).toBe(
      '28',
    );
  });

  it('produto sem preço iFood não entra no pedido do iFood', async () => {
    const { service } = build();
    await expect(service.create(CAIXA, IFOOD)).rejects.toThrow(
      '"X Salada" está sem preço',
    );
  });

  it('balcão que vira iFood é cobrado pelo preço iFood', async () => {
    const { service } = buildWithIfoodPrice();
    const counter = await service.create(CAIXA, COUNTER);
    const edited = await service.replace(CAIXA, counter.id, IFOOD);
    expect([counter.amount, edited.amount]).toEqual(['35.60', '49.80']);
  });

  it('forma do iFood desligada em Cadastros: erro que diz onde ligar', async () => {
    const { service, catalog } = buildWithIfoodPrice();
    catalog.ifoodActive = false;
    await expect(service.create(CAIXA, IFOOD)).rejects.toThrow(
      'Forma de pagamento do iFood 8 inativa',
    );
  });

  it('balcão não escolhe a forma do iFood', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMethodId: IFOOD_METHOD }),
    ).rejects.toThrow('é a do iFood');
  });
});
