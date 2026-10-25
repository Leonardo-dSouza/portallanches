import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  IssuedRange,
  ItemPriceRow,
  OutsideItemsChange,
  OutsideSnapshot,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';
import type {
  PurchaseRepository,
  VendorRecord,
} from './purchase-repository.js';
import { PurchaseService } from './purchase.service.js';

const inRange = (issuedAt: Date, range: IssuedRange) =>
  issuedAt >= range.from && issuedAt < range.until;

/** Compras em memória, com o filtro do período como no Prisma (emissão em [from, until)). */
class FakePurchaseRepository implements PurchaseRepository {
  readonly prices: ItemPriceRow[] = [];
  readonly nicknames = new Map<number, string | null>();
  readonly historyQueries: { vendorId: number; code: string }[] = [];
  /** Notas com os itens e o gasto, para marcar o que é de fora. */
  readonly snapshots = new Map<number, OutsideSnapshot>();
  readonly savedOutside: OutsideItemsChange[] = [];

  async listInvoices(): Promise<PurchaseInvoiceRow[]> {
    return [];
  }

  async listItemPrices(range: IssuedRange): Promise<ItemPriceRow[]> {
    return this.prices.filter((row) => inRange(row.issuedAt, range));
  }

  async listProductHistory(
    vendorId: number,
    code: string,
  ): Promise<ProductPurchase[]> {
    this.historyQueries.push({ vendorId, code });
    return [];
  }

  async listVendors(): Promise<VendorSummary[]> {
    return [];
  }

  async updateNickname(
    id: number,
    nickname: string | null,
  ): Promise<VendorRecord> {
    this.nicknames.set(id, nickname);
    return { id, cnpjRoot: '11222333', legalName: 'MERCADO EXEMPLO', nickname };
  }

  async findOutsideSnapshot(
    invoiceId: number,
  ): Promise<OutsideSnapshot | null> {
    return this.snapshots.get(invoiceId) ?? null;
  }

  /** Como o `updateMany` com o valor antigo no filtro: valor mudado = nada gravado. */
  async saveOutsideItems(change: OutsideItemsChange): Promise<boolean> {
    const snapshot = this.snapshots.get(change.invoiceId);
    if (snapshot?.expenseAmount !== change.previousAmount) return false;
    this.savedOutside.push(change);
    const outside = new Set(change.positions);
    this.snapshots.set(change.invoiceId, {
      ...snapshot,
      expenseAmount: change.expenseAmount,
      items: snapshot.items.map((item) => ({
        ...item,
        outsideBusiness: outside.has(item.position),
      })),
    });
    return true;
  }
}

/** Nota 12 do gasto 448 (R$ 34,61): bacon 24,83 e dois pães de forma de 4,89. */
function repoWithInvoice(expenseAmount = '34.61'): FakePurchaseRepository {
  const repo = new FakePurchaseRepository();
  repo.snapshots.set(12, {
    invoiceId: 12,
    expenseId: 448,
    expenseAmount,
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
});
