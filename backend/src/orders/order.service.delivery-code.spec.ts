import {
  ADMIN,
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
} from './order-fakes.fixture.js';

/** Bairro 3 é o da Ana (cliente 5, `DELIVERY`). */
const ANA_ZONE = 3;

/** Pedido entregue a outra pessoa no condomínio (pedido do usuário, 2026-11-21). */
describe('OrderService: código de entrega', () => {
  it('entrega para bairro com código ganha os 4 dígitos sorteados', async () => {
    const { service, catalog } = build();
    catalog.zonesWithCode.add(ANA_ZONE);
    const order = await service.create(CAIXA, DELIVERY);
    expect(order.deliveryCode).toBe('4827');
  });

  it('bairro sem código e balcão não sorteiam', async () => {
    const { service, codes } = build();
    const delivery = await service.create(CAIXA, DELIVERY);
    const counter = await service.create(CAIXA, COUNTER);
    expect([delivery.deliveryCode, counter.deliveryCode]).toEqual([null, null]);
    expect(codes.drawn).toBe(0);
  });

  it('editar mantém o código que o cliente já recebeu', async () => {
    const { service, catalog, codes } = build();
    catalog.zonesWithCode.add(ANA_ZONE);
    const created = await service.create(CAIXA, DELIVERY);
    const edited = await service.replace(CAIXA, created.id, DELIVERY);
    expect(edited.deliveryCode).toBe('4827');
    expect(codes.drawn).toBe(1);
  });

  it('bairro que ligou o código depois: a edição sorteia', async () => {
    const { service, catalog } = build();
    const created = await service.create(CAIXA, DELIVERY);
    catalog.zonesWithCode.add(ANA_ZONE);
    const edited = await service.replace(CAIXA, created.id, DELIVERY);
    expect(edited.deliveryCode).toBe('4827');
  });

  it('bairro sem código na edição apaga; ligado de novo, sorteia outro', async () => {
    const { service, catalog } = build();
    catalog.zonesWithCode.add(ANA_ZONE);
    const created = await service.create(CAIXA, DELIVERY);
    catalog.zonesWithCode.delete(ANA_ZONE);
    const cleared = await service.replace(CAIXA, created.id, DELIVERY);
    catalog.zonesWithCode.add(ANA_ZONE);
    const redrawn = await service.replace(CAIXA, created.id, DELIVERY);
    expect([cleared.deliveryCode, redrawn.deliveryCode]).toEqual([
      null,
      '5913',
    ]);
  });

  it('entrega que vira balcão perde o código', async () => {
    const { service, catalog } = build();
    catalog.zonesWithCode.add(ANA_ZONE);
    const created = await service.create(CAIXA, DELIVERY);
    const counter = await service.replace(ADMIN, created.id, COUNTER);
    expect(counter.deliveryCode).toBeNull();
  });
});
