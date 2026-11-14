import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FakePurchaseRepository } from './purchase-fakes.fixture.js';
import { PurchaseService } from './purchase.service.js';

/** Nota 12 do gasto 448 (R$ 34,61): bacon 24,83 e dois pães de forma de 4,89. */
function repoWithInvoice(
  expenseAmount = '34.61',
  discount = '0.00',
  businessDiscount = discount,
): FakePurchaseRepository {
  const repo = new FakePurchaseRepository();
  repo.snapshots.set(12, {
    invoiceId: 12,
    expenseId: 448,
    expenseAmount,
    discount,
    businessDiscount,
    items: [
      { position: 1, total: '24.83', outsideBusiness: false },
      { position: 2, total: '4.89', outsideBusiness: false },
      { position: 3, total: '4.89', outsideBusiness: false },
    ],
  });
  return repo;
}

const price = (unitPrice: string, issuedAt: string, invoiceId: number) => ({
  vendorId: 1,
  vendorName: 'Exemplo',
  code: '1128810',
  description: 'BACON EXEMPLO kg',
  unit: 'Kg',
  unitPrice,
  invoiceId,
  position: 1,
  issuedAt: new Date(issuedAt),
});

describe('PurchaseService', () => {
  it('preços só das notas emitidas no período (dia de SP)', async () => {
    const repo = new FakePurchaseRepository();
    repo.prices.push(
      // 30/09 às 23:30 em SP: fora de outubro.
      price('18', '2026-10-01T02:30:00Z', 1),
      price('19.9', '2026-10-05T20:00:00Z', 2),
      price('21', '2026-10-18T20:00:00Z', 3),
    );
    const [bacon] = await new PurchaseService(repo).listProducts(
      '2026-10-01',
      '2026-10-31',
    );
    expect(bacon).toMatchObject({
      lastPrice: '21',
      previousPrice: '19.9',
      minPrice: '19.9',
      purchaseCount: 2,
    });
  });

  it('período inválido é 400 antes de ler o banco', async () => {
    await expect(
      new PurchaseService(new FakePurchaseRepository()).listProducts(
        '2026-10-31',
        '2026-10-01',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('o histórico pede o produto validado', async () => {
    const repo = new FakePurchaseRepository();
    await new PurchaseService(repo).productHistory(
      '1',
      ' 1128810 ',
      '2026-10-01',
      '2026-10-31',
    );
    expect(repo.historyQueries).toEqual([{ vendorId: 1, code: '1128810' }]);
  });

  it('apelido vazio tira o apelido do mercado', async () => {
    const repo = new FakePurchaseRepository();
    await new PurchaseService(repo).renameVendor(1, { nickname: ' ' });
    expect(repo.nicknames.get(1)).toBeNull();
  });
});

describe('PurchaseService.markOutsideItems (2026-10-25)', () => {
  it('marca os itens e desconta do gasto da noite', async () => {
    const repo = repoWithInvoice();
    const result = await new PurchaseService(repo).markOutsideItems(12, {
      positions: [2, 3],
    });
    expect(result).toEqual({
      invoiceId: 12,
      expenseId: 448,
      expenseAmount: '24.83',
      outsideItemCount: 2,
    });
    expect(repo.savedOutside[0]).toMatchObject({
      positions: [2, 3],
      previousAmount: '34.61',
    });
  });

  it('desmarcar depois devolve o valor', async () => {
    const repo = repoWithInvoice();
    const service = new PurchaseService(repo);
    await service.markOutsideItems(12, { positions: [2] });
    const result = await service.markOutsideItems(12, { positions: [] });
    expect(result.expenseAmount).toBe('34.61');
  });

  it('nota que não existe é 404', async () => {
    await expect(
      new PurchaseService(repoWithInvoice()).markOutsideItems(99, {
        positions: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('posição fora da nota é 400 e a nota inteira é 422, sem gravar', async () => {
    const repo = repoWithInvoice();
    const service = new PurchaseService(repo);
    await expect(
      service.markOutsideItems(12, { positions: [4] }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.markOutsideItems(12, { positions: [1, 2, 3] }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(repo.savedOutside).toEqual([]);
  });

  it('gasto que ficaria zerado é 422', async () => {
    // Lançado à mão com 20,00: tirar o bacon (24,83) deixaria negativo.
    await expect(
      new PurchaseService(repoWithInvoice('20.00')).markOutsideItems(12, {
        positions: [1],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('gasto mudado no meio do caminho é 409 e nada é gravado', async () => {
    const repo = repoWithInvoice();
    repo.saveOutsideItems = async () => false;
    await expect(
      new PurchaseService(repo).markOutsideItems(12, { positions: [2] }),
    ).rejects.toThrow(ConflictException);
  });

  it('corpo sem a lista é 400', async () => {
    await expect(
      new PurchaseService(repoWithInvoice()).markOutsideItems(12, {}),
    ).rejects.toThrow('Campo "positions" inválido');
  });

  describe('com businessDiscount (2026-11-08)', () => {
    function repoRealInvoice(): FakePurchaseRepository {
      const repo = new FakePurchaseRepository();
      repo.snapshots.set(20, {
        invoiceId: 20,
        expenseId: 500,
        expenseAmount: '43.14',
        discount: '7.19',
        businessDiscount: '7.19',
        items: [
          { position: 1, total: '28.56', outsideBusiness: false },
          { position: 2, total: '21.77', outsideBusiness: false },
        ],
      });
      return repo;
    }

    it('exemplo real: desconto da lanchonete 0 joga o desconto para o item de fora (gasto 21.77)', async () => {
      const repo = repoRealInvoice();
      const result = await new PurchaseService(repo).markOutsideItems(20, {
        positions: [1],
        businessDiscount: '0.00',
      });
      expect(result.expenseAmount).toBe('21.77');
      expect(repo.savedOutside[0].businessDiscount).toBe('0.00');
    });

    it('exemplo real: desconto da lanchonete 7.19 mantém comportamento anterior (gasto 14.58)', async () => {
      const repo = repoRealInvoice();
      const result = await new PurchaseService(repo).markOutsideItems(20, {
        positions: [1],
        businessDiscount: '7.19',
      });
      expect(result.expenseAmount).toBe('14.58');
      expect(repo.savedOutside[0].businessDiscount).toBe('7.19');
    });

    it('exemplo real: valor no meio de R$ 3.00 divide o desconto (gasto 18.77)', async () => {
      const repo = repoRealInvoice();
      const result = await new PurchaseService(repo).markOutsideItems(20, {
        positions: [1],
        businessDiscount: '3.00',
      });
      expect(result.expenseAmount).toBe('18.77');
      expect(repo.savedOutside[0].businessDiscount).toBe('3.00');
    });

    it('desmarcar todos os itens grava o desconto inteiro na nota', async () => {
      const repo = repoRealInvoice();
      const service = new PurchaseService(repo);
      await service.markOutsideItems(20, {
        positions: [1],
        businessDiscount: '0.00',
      });
      const result = await service.markOutsideItems(20, { positions: [] });
      expect(result.expenseAmount).toBe('43.14');
      expect(repo.savedOutside[1].businessDiscount).toBe('7.19');
    });

    it('rejeita businessDiscount fora da faixa de 0 a discount', async () => {
      const repo = repoRealInvoice();
      await expect(
        new PurchaseService(repo).markOutsideItems(20, {
          positions: [1],
          businessDiscount: '10.00',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        new PurchaseService(repo).markOutsideItems(20, {
          positions: [1],
          businessDiscount: '10.00',
        }),
      ).rejects.toThrow(
        'Campo "businessDiscount" fora da faixa: recebido "10.00", esperado entre 0.00 e 7.19',
      );
    });

    it('rejeita businessDiscount menor que max(0, desconto - foraCheio)', async () => {
      const repo = new FakePurchaseRepository();
      repo.snapshots.set(21, {
        invoiceId: 21,
        expenseId: 501,
        expenseAmount: '90.00',
        discount: '10.00',
        businessDiscount: '10.00',
        items: [
          { position: 1, total: '5.00', outsideBusiness: false },
          { position: 2, total: '95.00', outsideBusiness: false },
        ],
      });
      await expect(
        new PurchaseService(repo).markOutsideItems(21, {
          positions: [1],
          businessDiscount: '4.00',
        }),
      ).rejects.toThrow(
        'Campo "businessDiscount" fora da faixa: recebido "4.00", esperado entre 5.00 e 10.00',
      );
    });
  });

  describe('saveItemLink e deleteItemLink', () => {
    it('ligar duas vezes o mesmo mercado + código substitui a ligação existente', async () => {
      const repo = new FakePurchaseRepository();
      repo.vendors.set(1, {
        id: 1,
        cnpjRoot: '11222333',
        legalName: 'MERCADO EXEMPLO',
        nickname: null,
      });
      repo.supplies.set(10, {
        id: 10,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      repo.supplies.set(11, {
        id: 11,
        name: 'Hambúrguer 90g',
        unitCost: '1.8000',
      });
      const service = new PurchaseService(repo);

      const first = await service.saveItemLink(1, {
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: 'cx 36',
      });
      expect(first).toMatchObject({
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: 'cx 36',
      });

      const second = await service.saveItemLink(1, {
        vendorId: 1,
        code: '1128810',
        supplyId: 11,
        baseQuantity: '24',
        label: 'cx 24',
      });
      expect(second).toMatchObject({
        id: first.id,
        vendorId: 1,
        code: '1128810',
        supplyId: 11,
        baseQuantity: '24',
        label: 'cx 24',
      });
      expect(repo.links.size).toBe(1);
    });

    it('mercado inexistente lança 422 com o id', async () => {
      const repo = new FakePurchaseRepository();
      repo.supplies.set(10, {
        id: 10,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      const service = new PurchaseService(repo);

      await expect(
        service.saveItemLink(1, {
          vendorId: 999,
          code: '1128810',
          supplyId: 10,
          baseQuantity: '36',
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException('Mercado 999 não encontrado'),
      );
    });

    it('insumo inexistente lança 422 com o id', async () => {
      const repo = new FakePurchaseRepository();
      repo.vendors.set(1, {
        id: 1,
        cnpjRoot: '11222333',
        legalName: 'MERCADO EXEMPLO',
        nickname: null,
      });
      const service = new PurchaseService(repo);

      await expect(
        service.saveItemLink(1, {
          vendorId: 1,
          code: '1128810',
          supplyId: 888,
          baseQuantity: '36',
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException('Insumo 888 não encontrado'),
      );
    });

    it('deleteItemLink remove a ligação existente ou devolve 404', async () => {
      const repo = new FakePurchaseRepository();
      repo.vendors.set(1, {
        id: 1,
        cnpjRoot: '11222333',
        legalName: 'MERCADO EXEMPLO',
        nickname: null,
      });
      repo.supplies.set(10, {
        id: 10,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      const service = new PurchaseService(repo);

      await service.saveItemLink(1, {
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
      });

      await expect(
        service.deleteItemLink(1, '1128810'),
      ).resolves.toBeUndefined();
      expect(repo.links.size).toBe(0);

      await expect(service.deleteItemLink(1, '1128810')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listInvoices com alertas e ligação a insumos', () => {
    it('nota com um item ligado acima da base devolve aboveBaseCount: 1 e os detalhes do alerta', async () => {
      const repo = new FakePurchaseRepository();
      repo.vendors.set(1, {
        id: 1,
        cnpjRoot: '11222333',
        legalName: 'MERCADO EXEMPLO',
        nickname: null,
      });
      repo.supplies.set(10, {
        id: 10,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      repo.links.set('1|1128810', {
        id: 1,
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: 'cx 36',
      });
      repo.invoices.set(1, {
        id: 1,
        expenseId: 100,
        vendorId: 1,
        vendorName: 'MERCADO EXEMPLO',
        number: 1234,
        series: 1,
        issuedAt: '2026-10-15T12:00:00.000Z',
        itemCount: 1,
        outsideItemCount: 0,
        aboveBaseCount: 0,
        amountDue: '45.79',
        expenseAmount: '45.79',
        businessDate: '2026-10-15',
        stockEnteredAt: null,
        stockEnteredByName: null,
        items: [
          {
            id: 1,
            position: 1,
            code: '1128810',
            description: 'HAMB FAROESTE 36X56G',
            quantity: '1',
            unit: 'cx',
            unitPrice: '45.79',
            total: '45.79',
            outsideBusiness: false,
            link: null,
            alert: null,
          },
        ],
      });

      const service = new PurchaseService(repo);
      const [invoice] = await service.listInvoices('2026-10-01', '2026-10-31');

      expect(invoice.aboveBaseCount).toBe(1);
      expect(invoice.items[0].link).toEqual({
        supplyId: 10,
        supplyName: 'Hambúrguer 56g',
        baseQuantity: '36',
        label: 'cx 36',
      });
      expect(invoice.items[0].alert).toEqual({
        paidPerUnit: '1.2719',
        basePerUnit: '1.2444',
        diffPercent: '2.2',
        above: true,
      });
    });

    it('item fora da lanchonete não conta para aboveBaseCount nem gera alerta', async () => {
      const repo = new FakePurchaseRepository();
      repo.vendors.set(1, {
        id: 1,
        cnpjRoot: '11222333',
        legalName: 'MERCADO EXEMPLO',
        nickname: null,
      });
      repo.supplies.set(10, {
        id: 10,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      repo.links.set('1|1128810', {
        id: 1,
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: 'cx 36',
      });
      repo.invoices.set(1, {
        id: 1,
        expenseId: 100,
        vendorId: 1,
        vendorName: 'MERCADO EXEMPLO',
        number: 1234,
        series: 1,
        issuedAt: '2026-10-15T12:00:00.000Z',
        itemCount: 1,
        outsideItemCount: 1,
        aboveBaseCount: 0,
        amountDue: '45.79',
        expenseAmount: '45.79',
        businessDate: '2026-10-15',
        stockEnteredAt: null,
        stockEnteredByName: null,
        items: [
          {
            id: 1,
            position: 1,
            code: '1128810',
            description: 'HAMB FAROESTE 36X56G',
            quantity: '1',
            unit: 'cx',
            unitPrice: '45.79',
            total: '45.79',
            outsideBusiness: true,
            link: null,
            alert: null,
          },
        ],
      });

      const service = new PurchaseService(repo);
      const [invoice] = await service.listInvoices('2026-10-01', '2026-10-31');

      expect(invoice.aboveBaseCount).toBe(0);
      expect(invoice.items[0].alert).toBeNull();
      expect(invoice.items[0].link).toEqual({
        supplyId: 10,
        supplyName: 'Hambúrguer 56g',
        baseQuantity: '36',
        label: 'cx 36',
      });
    });
  });

  describe('enterInvoiceStock', () => {
    it('rejeita nota emitida antes de 2026-11-14 com 422 e a data', async () => {
      const repo = new FakePurchaseRepository();
      repo.invoiceTargets.set(1, {
        id: 1,
        issuedAt: new Date('2026-11-13T22:00:00-03:00'),
        stockEnteredAt: null,
        items: [
          {
            id: 10,
            invoiceId: 1,
            quantity: '1',
            unitPrice: '10.00',
            outsideBusiness: false,
            link: { supplyId: 5, baseQuantity: '1' },
          },
        ],
      });
      const service = new PurchaseService(repo);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 10 }] }),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 10 }] }),
      ).rejects.toThrow('2026-11-13');
    });

    it('rejeita segunda chamada para a mesma nota com 409', async () => {
      const repo = new FakePurchaseRepository();
      repo.invoiceTargets.set(1, {
        id: 1,
        issuedAt: new Date('2026-11-14T10:00:00-03:00'),
        stockEnteredAt: null,
        items: [
          {
            id: 10,
            invoiceId: 1,
            quantity: '1',
            unitPrice: '10.00',
            outsideBusiness: false,
            link: { supplyId: 5, baseQuantity: '1' },
          },
        ],
      });
      const service = new PurchaseService(repo);
      const lots = await service.enterInvoiceStock(1, 1, {
        items: [{ itemId: 10, expiresOn: null }],
      });
      expect(lots).toHaveLength(1);

      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 10 }] }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejeita item sem ligação com 422 e o id', async () => {
      const repo = new FakePurchaseRepository();
      repo.invoiceTargets.set(1, {
        id: 1,
        issuedAt: new Date('2026-11-14T10:00:00-03:00'),
        stockEnteredAt: null,
        items: [
          {
            id: 10,
            invoiceId: 1,
            quantity: '1',
            unitPrice: '10.00',
            outsideBusiness: false,
            link: null,
          },
        ],
      });
      const service = new PurchaseService(repo);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 10 }] }),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 10 }] }),
      ).rejects.toThrow('10');
    });

    it('rejeita item fora da lanchonete com 422 e o id', async () => {
      const repo = new FakePurchaseRepository();
      repo.invoiceTargets.set(1, {
        id: 1,
        issuedAt: new Date('2026-11-14T10:00:00-03:00'),
        stockEnteredAt: null,
        items: [
          {
            id: 20,
            invoiceId: 1,
            quantity: '1',
            unitPrice: '10.00',
            outsideBusiness: true,
            link: { supplyId: 5, baseQuantity: '1' },
          },
        ],
      });
      const service = new PurchaseService(repo);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 20 }] }),
      ).rejects.toThrow(UnprocessableEntityException);
      await expect(
        service.enterInvoiceStock(1, 1, { items: [{ itemId: 20 }] }),
      ).rejects.toThrow('20');
    });

    it('a entrada no estoque NÃO altera o custo unitário do insumo', async () => {
      const repo = new FakePurchaseRepository();
      repo.supplies.set(5, {
        id: 5,
        name: 'Hambúrguer 56g',
        unitCost: '1.2444',
      });
      repo.invoiceTargets.set(1, {
        id: 1,
        issuedAt: new Date('2026-11-14T10:00:00-03:00'),
        stockEnteredAt: null,
        items: [
          {
            id: 10,
            invoiceId: 1,
            quantity: '2',
            unitPrice: '44.89',
            outsideBusiness: false,
            link: { supplyId: 5, baseQuantity: '36' },
          },
        ],
      });
      const service = new PurchaseService(repo);
      await service.enterInvoiceStock(1, 1, {
        items: [{ itemId: 10, expiresOn: null }],
      });

      expect(repo.supplies.get(5)?.unitCost).toBe('1.2444');
      expect(repo.savedStockLots[0].unitCost).toBe('1.2469');
      expect(repo.savedStockLots[0].quantity).toBe('72');
    });
  });

  describe('supplyPrices e lastPrices', () => {
    it('prices: duas compras do mesmo insumo por códigos diferentes aparecem as duas, mais nova primeiro', async () => {
      const repo = new FakePurchaseRepository();
      repo.supplyPrices.set(10, [
        {
          invoiceId: 2,
          issuedAt: '2026-11-14T10:00:00.000Z',
          vendorName: 'Atacadão',
          description: 'HAMB 56G NOVO',
          quantity: '1',
          unit: 'cx',
          unitPrice: '46.00',
          label: 'cx 36',
          baseQuantity: '36',
          paidPerUnit: '1.2778',
          basePerUnit: '1.2444',
          diffPercent: '2.7',
          above: true,
        },
        {
          invoiceId: 1,
          issuedAt: '2026-11-10T10:00:00.000Z',
          vendorName: 'Assaí',
          description: 'HAMB 56G FAROESTE',
          quantity: '2',
          unit: 'cx',
          unitPrice: '44.89',
          label: 'cx 36',
          baseQuantity: '36',
          paidPerUnit: '1.2469',
          basePerUnit: '1.2444',
          diffPercent: '0.2',
          above: true,
        },
      ]);
      const service = new PurchaseService(repo);
      const prices = await service.supplyPrices(10);
      expect(prices).toHaveLength(2);
      expect(prices[0].invoiceId).toBe(2);
      expect(prices[1].invoiceId).toBe(1);
    });

    it('last-prices traz só a compra ligada mais recente de cada insumo', async () => {
      const repo = new FakePurchaseRepository();
      repo.lastPricesMap.set(10, {
        issuedAt: '2026-11-14T10:00:00.000Z',
        vendorName: 'Atacadão',
        paidPerUnit: '1.2778',
        diffPercent: '2.7',
        above: true,
      });
      repo.lastPricesMap.set(20, {
        issuedAt: '2026-11-12T10:00:00.000Z',
        vendorName: 'Assaí',
        paidPerUnit: '36.5',
        diffPercent: '0.0',
        above: false,
      });
      const service = new PurchaseService(repo);
      const lastPrices = await service.lastPrices();
      expect(lastPrices).toEqual({
        10: {
          issuedAt: '2026-11-14T10:00:00.000Z',
          vendorName: 'Atacadão',
          paidPerUnit: '1.2778',
          diffPercent: '2.7',
          above: true,
        },
        20: {
          issuedAt: '2026-11-12T10:00:00.000Z',
          vendorName: 'Assaí',
          paidPerUnit: '36.5',
          diffPercent: '0.0',
          above: false,
        },
      });
    });
  });
});
