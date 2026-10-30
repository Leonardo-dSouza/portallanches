import { ADMIN, CAIXA } from '../orders/order-fakes.fixture.js';
import { buildStaffConsumption } from './staff-consumption-fakes.fixture.js';

const X_SALADA = { productId: 9, quantity: 1 };
const GUARANA = { productId: 61, quantity: 2 };
const BIANCA = { consumerName: ' Bianca ', items: [X_SALADA] };

describe('StaffConsumptionService.create', () => {
  it('grava quem consumiu e os itens com o preço e o CMV do dia, com o custo na resposta', async () => {
    const { service, consumptions, catalog } = buildStaffConsumption();

    const saved = await service.create(CAIXA, BIANCA);

    expect(consumptions.records[0]).toMatchObject({
      closingId: 10,
      createdById: CAIXA.id,
      consumerName: 'Bianca',
      consumerKey: 'bianca',
    });
    expect(saved.items[0]).toMatchObject({
      productName: 'X Salada',
      unitPrice: '17.80',
      unitCmv: '2.44',
    });
    expect(saved).toMatchObject({
      cmvTotal: '2.44',
      missingCostCount: 0,
      live: true,
    });
    expect(saved).not.toHaveProperty('consumerKey');
    expect(catalog.pricedOn).toEqual(['2026-09-22']);
  });

  it('na noite em andamento baixa o estoque como o pedido e devolve o aviso de saldo', async () => {
    const { service, consumptions } = buildStaffConsumption();
    const shortfall = {
      supplyId: 30,
      supplyName: 'Guaraná lata',
      missing: '1',
    };
    consumptions.shortfalls = [shortfall];

    const saved = await service.create(CAIXA, {
      consumerName: 'Equipe',
      items: [GUARANA],
    });

    expect(consumptions.stockChanges).toEqual([
      {
        id: 1,
        stock: { userId: CAIXA.id, needs: [{ supplyId: 30, milli: 2000 }] },
      },
    ]);
    expect(saved.stockShortfalls).toEqual([shortfall]);
  });

  it('dia passado (admin) anota sem mexer no estoque', async () => {
    const lateNight = new Date('2026-09-25T23:00:00Z');
    const { service, consumptions } = buildStaffConsumption(lateNight);

    const saved = await service.create(ADMIN, BIANCA, '2026-09-22');

    expect(consumptions.stockChanges).toEqual([{ id: 1, stock: null }]);
    expect(saved.live).toBe(false);
  });

  it('caixa não lança fora da noite em andamento', async () => {
    const { service, closings } = buildStaffConsumption();
    closings.today = { ...closings.today, businessDate: '2026-08-01' };

    await expect(service.create(CAIXA, BIANCA)).rejects.toThrow(
      /só abre a noite em andamento/,
    );
  });

  it('recusa corpo sem o nome antes de olhar o dia', async () => {
    const { service, closings } = buildStaffConsumption();

    await expect(service.create(CAIXA, { items: [X_SALADA] })).rejects.toThrow(
      /"consumerName" inválido/,
    );
    expect(closings.askedDates).toEqual([]);
  });
});

describe('StaffConsumptionService: retirada de ingrediente', () => {
  it('tira o ingrediente da baixa e do custo, como no pedido', async () => {
    const { service, consumptions } = buildStaffConsumption();
    const saved = await service.create(CAIXA, {
      consumerName: 'Bianca',
      items: [{ productId: 11, quantity: 1, removedSupplyIds: [40] }],
    });
    expect(saved).toMatchObject({ cmvTotal: '2.00' });
    expect(saved.items[0].removals).toEqual([
      { supplyId: 40, supplyName: 'Ovo' },
    ]);
    expect(consumptions.stockChanges[0]?.stock?.needs).toEqual([
      { supplyId: 41, milli: 1000 },
    ]);
  });
});

describe('StaffConsumptionService.replace', () => {
  it('mantém o preço e o CMV da época das linhas que já estavam e baixa de novo', async () => {
    const { service, consumptions, catalog } = buildStaffConsumption();
    await service.create(CAIXA, BIANCA);
    catalog.products[0] = { ...catalog.products[0], salePrice: '19.90' };

    const saved = await service.replace(CAIXA, 1, {
      consumerName: 'Bianca',
      items: [{ ...X_SALADA, quantity: 2 }, GUARANA],
    });

    expect(saved.items.map((i) => [i.productName, i.unitPrice])).toEqual([
      ['X Salada', '17.80'],
      ['Guaraná lata', '6.00'],
    ]);
    expect(consumptions.stockChanges.at(-1)).toEqual({
      id: 1,
      stock: { userId: CAIXA.id, needs: [{ supplyId: 30, milli: 2000 }] },
    });
  });

  it('caixa não edita consumo de outro dia', async () => {
    const { service, consumptions } = buildStaffConsumption();
    await service.create(CAIXA, BIANCA);
    consumptions.records[0] = { ...consumptions.records[0], closingId: 99 };

    await expect(service.replace(CAIXA, 1, BIANCA)).rejects.toThrow(
      /só abre a noite em andamento/,
    );
  });

  it('consumo inexistente é 404 com o id', async () => {
    const { service } = buildStaffConsumption();

    await expect(service.replace(CAIXA, 7, BIANCA)).rejects.toThrow(
      'Consumo interno 7 não encontrado',
    );
  });
});

describe('StaffConsumptionService.remove', () => {
  it('na noite em andamento devolve ao estoque e apaga', async () => {
    const { service, consumptions } = buildStaffConsumption();
    await service.create(CAIXA, BIANCA);

    await service.remove(CAIXA, 1);

    expect(consumptions.records).toEqual([]);
    expect(consumptions.stockChanges.at(-1)).toEqual({
      id: 1,
      stock: { userId: CAIXA.id, needs: [] },
    });
  });

  it('admin apagando dia passado não mexe no estoque', async () => {
    const { service, consumptions } = buildStaffConsumption();
    await service.create(ADMIN, BIANCA);
    consumptions.records[0] = { ...consumptions.records[0], closingId: 99 };

    await service.remove(ADMIN, 1);

    expect(consumptions.stockChanges.at(-1)).toEqual({ id: 1, stock: null });
  });
});

describe('StaffConsumptionService listas', () => {
  it('lista o dia com o custo de cada lançamento', async () => {
    const { service } = buildStaffConsumption();
    await service.create(CAIXA, BIANCA);

    const list = await service.listFor(CAIXA);

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ consumerName: 'Bianca', cmvTotal: '2.44' });
  });

  it('sugere os nomes dos últimos 60 dias, até 20', async () => {
    const { service, consumptions } = buildStaffConsumption();
    consumptions.names = ['Bianca', 'Motoboy'];

    expect(await service.recentNames()).toEqual(['Bianca', 'Motoboy']);
    expect(consumptions.namesAsked).toEqual([
      { since: new Date('2026-07-24T23:00:00Z'), limit: 20 },
    ]);
  });
});
