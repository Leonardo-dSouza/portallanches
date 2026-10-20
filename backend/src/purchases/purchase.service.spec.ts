import { BadRequestException } from '@nestjs/common';
import type {
  IssuedRange,
  ItemPriceRow,
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
