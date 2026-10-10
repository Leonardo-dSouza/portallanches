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
  categoryName: 'Refrigerantes',
  salePrice: '6.00',
  active: true,
  deactivatedOn: null,
  supersededPrice: null,
  stockComponents: [{ supplyId: 30, milli: 1000 }],
};

describe('ProductService', () => {
  it('grava com a chave do nome e devolve CMV e % do preço', async () => {
    const { service, products } = build();
    const created = await service.create({ ...X_SALADA, name: 'X Salada Ó' });
    expect(products.saved[0].nameKey).toBe('x salada o');
    // 0,036 × 39,90 + 1 × 2,35 = 3,7864 → 3,79
    expect(created).toMatchObject({
      cmv: '3.79',
      cmvComplete: true,
      cmvPercent: '37.9',
    });
  });

  it('insumo sem custo deixa o CMV incompleto; sem preço não há %', async () => {
    const { service } = build();
    const created = await service.create({
      ...X_SALADA,
      salePrice: null,
      components: [...X_SALADA.components, { supplyId: 9, quantity: '0.03' }],
    });
    expect(created).toMatchObject({
      cmv: '3.79',
      cmvComplete: false,
      cmvPercent: null,
    });
  });

  it('atualiza trocando a composição e lista com o CMV calculado', async () => {
    const { service } = build();
    const created = await service.create(X_SALADA);
    await service.update(created.id, {
      ...X_SALADA,
      components: [{ supplyId: 7, quantity: 2 }],
    });
    const [listed] = await service.list();
    expect(listed).toMatchObject({
      cmv: '4.70',
      components: [{ quantity: '2' }],
    });
  });

  it('a edição grava com o dia de negócio da lanchonete, não o do UTC', async () => {
    const { service, products } = build();
    const created = await service.create(X_SALADA);
    await service.update(created.id, { ...X_SALADA, salePrice: '19.90' });
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
        categoryName: 'Tradicional',
        salePrice: '19.90',
        active: true,
        deactivatedOn: null,
        supersededPrice: '17.80',
        stockComponents: [],
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
      service.create({ ...X_SALADA, categoryId: 99 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('insumo inexistente → 422 citando os ids', async () => {
    const { service } = build();
    await expect(
      service.create({
        ...X_SALADA,
        components: [
          { supplyId: 50, quantity: 1 },
          { supplyId: 51, quantity: 1 },
        ],
      }),
    ).rejects.toThrow(/Insumos inexistentes na composição: 50, 51/);
  });

  it('produto inexistente no PUT → 404', async () => {
    const { service } = build();
    await expect(service.update(99, X_SALADA)).rejects.toThrow(
      NotFoundException,
    );
  });
});
