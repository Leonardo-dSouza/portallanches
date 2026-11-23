import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { build, X_SALADA } from './product-fakes.fixture.js';

const COCA_LATA = {
  id: 68,
  name: 'Coca lata',
  menuNumber: null,
  categoryId: 4,
  categoryName: 'Refrigerantes',
  addonCategoryId: null,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '6.00',
  ifoodPrice: null,
  active: true,
  deactivatedOn: null,
  supersededPrice: null,
  stockComponents: [{ supplyId: 30, milli: 1000 }],
  removables: [],
  bundleItems: [],
};

describe('ProductService', () => {
  it('grava com a chave do nome e devolve CMV e % do preço', async () => {
    const { service, products } = build();
    const created = await service.create({
      ...X_SALADA,
      name: 'X Salada Ó',
      components: [],
    });
    expect(products.saved[0].nameKey).toBe('x salada o');
    expect(created).toMatchObject({
      cmv: '0.00',
      cmvComplete: true,
      cmvPercent: '0.0',
    });

    // Produto cuja receita foi gravada em Custos (POST /costs/apply)
    await products.create({
      ...X_SALADA,
      nameKey: 'x salada',
      bundleItems: [],
    });
    const [, seeded] = await service.list();
    // 0,036 × 39,90 + 1 × 2,35 = 3,7864 → 3,79
    expect(seeded).toMatchObject({
      cmv: '3.79',
      cmvComplete: true,
      cmvPercent: '37.9',
    });
  });

  it('insumo sem custo deixa o CMV incompleto; sem preço não há %', async () => {
    const { service, products } = build();
    await products.create({
      ...X_SALADA,
      nameKey: 'x salada',
      salePrice: null,
      components: [...X_SALADA.components, { supplyId: 9, quantity: '0.03' }],
      bundleItems: [],
    });
    const [listed] = await service.list();
    expect(listed).toMatchObject({
      cmv: '3.79',
      cmvComplete: false,
      cmvPercent: null,
    });
  });

  it('PUT de produto sem components mantém', async () => {
    const { service, products } = build();
    const seeded = await products.create({
      ...X_SALADA,
      nameKey: 'x salada',
      bundleItems: [],
    });
    const updated = await service.update(seeded.id, {
      ...X_SALADA,
      components: undefined,
      name: 'X Salada Novo Nome',
    });
    expect(updated.components).toHaveLength(2);
    expect(updated.cmv).toBe('3.79');
  });

  it('meta própria: PUT sem profitPercent mantém, null volta para a da categoria', async () => {
    const { service } = build();
    const created = await service.create({
      ...X_SALADA,
      components: undefined,
      profitPercent: '10',
    });
    expect(created.profitPercent).toBe('10');
    const kept = await service.update(created.id, {
      ...X_SALADA,
      components: undefined,
      name: 'X Burguer',
    });
    expect(kept.profitPercent).toBe('10');
    const cleared = await service.update(created.id, {
      ...X_SALADA,
      components: undefined,
      profitPercent: null,
    });
    expect(cleared.profitPercent).toBeNull();
  });

  it('igual em outra ordem mantém', async () => {
    const { service, products } = build();
    const seeded = await products.create({
      ...X_SALADA,
      nameKey: 'x salada',
      bundleItems: [],
    });
    const updated = await service.update(seeded.id, {
      ...X_SALADA,
      components: [
        { supplyId: 7, quantity: '1.0' },
        { supplyId: 4, quantity: '0.036' },
      ],
      name: 'X Salada Mesma Receita',
    });
    expect(updated.components).toHaveLength(2);
    expect(updated.cmv).toBe('3.79');
  });

  it('diferente → 422', async () => {
    const { service, products } = build();
    const seeded = await products.create({
      ...X_SALADA,
      nameKey: 'x salada',
      bundleItems: [],
    });
    await expect(
      service.update(seeded.id, {
        ...X_SALADA,
        components: [{ supplyId: 7, quantity: 2 }],
      }),
    ).rejects.toThrow(/Receita de.*muda em Custos \(POST \/costs\/apply\)/);
  });

  it('POST com itens → 422', async () => {
    const { service } = build();
    await expect(
      service.create({
        ...X_SALADA,
        components: [{ supplyId: 7, quantity: 1 }],
      }),
    ).rejects.toThrow(/Receita de.*muda em Custos \(POST \/costs\/apply\)/);
  });

  it('a edição grava com o dia de negócio da lanchonete, não o do UTC', async () => {
    const { service, products } = build();
    const created = await service.create({ ...X_SALADA, components: [] });
    await service.update(created.id, {
      ...X_SALADA,
      components: [],
      salePrice: '19.90',
    });
    expect(products.updatedOn).toEqual(['2026-10-09']);
  });

  it('cardápio do caixa sem data usa o dia de negócio de hoje', async () => {
    const { service, products } = build();
    await service.listForSale();
    expect(products.menuDates).toEqual(['2026-10-09']);
  });

  it('cardápio do caixa num dia passado traz o preço da época', async () => {
    const { service, products } = build();
    products.datedMenu = [
      {
        id: 9,
        name: 'X Salada',
        menuNumber: 9,
        categoryId: 1,
        categoryName: 'Tradicional',
        addonCategoryId: 3,
        choiceCategoryId: null,
        sortOrder: 0,
        salePrice: '19.90',
        ifoodPrice: null,
        active: true,
        deactivatedOn: null,
        supersededPrice: '17.80',
        stockComponents: [],
        removables: [],
        bundleItems: [],
      },
    ];
    const menu = await service.listForSale('2026-10-05');
    expect(products.menuDates).toEqual(['2026-10-05']);
    expect(menu.map((item) => item.salePrice)).toEqual(['17.80']);
  });

  it('cardápio de hoje mostra o saldo baixo da bebida', async () => {
    const { service, products } = build();
    products.datedMenu = [COCA_LATA];
    products.balances.set(30, 4000);
    const [coca] = await service.listForSale();
    expect(coca.stockLeft).toBe(4);
  });

  it('caixa atrasado não mostra saldo (não mexe no estoque)', async () => {
    const { service, products } = build();
    products.datedMenu = [COCA_LATA];
    products.balances.set(30, 4000);
    const [coca] = await service.listForSale('2026-10-05');
    expect(coca.stockLeft).toBeNull();
  });

  it('aviso 0 desliga o saldo no caixa', async () => {
    const { service, products, settings } = build();
    products.datedMenu = [COCA_LATA];
    settings.lowStockWarning = 0;
    const [coca] = await service.listForSale();
    expect(coca.stockLeft).toBeNull();
  });

  it('cardápio do caixa com data inválida → 400', async () => {
    await expect(build().service.listForSale('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('categoria inexistente → 422', async () => {
    const { service } = build();
    await expect(
      service.create({ ...X_SALADA, components: [], categoryId: 99 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('produto inexistente no PUT → 404', async () => {
    const { service } = build();
    await expect(
      service.update(99, { ...X_SALADA, components: [] }),
    ).rejects.toThrow(NotFoundException);
  });
});
