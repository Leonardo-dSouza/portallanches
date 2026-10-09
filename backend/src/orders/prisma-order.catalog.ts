import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { expandBundle } from '../products/bundle.js';
import { priceOnDate } from '../products/dated-price.js';
import {
  datedPriceSelect,
  toDatedProduct,
} from '../products/prisma-dated-price.js';
import type { SaleComponent, SaleProduct } from './order-pricing.js';
import type {
  CustomerEntry,
  DeliveryZoneEntry,
  OrderCatalog,
  PaymentMethodEntry,
} from './order-repository.js';

const COSTED_COMPONENTS = {
  select: {
    supplyId: true,
    quantity: true,
    supply: { select: { unitCost: true, deductOnSale: true } },
  },
} as const;

type CostedRow = {
  supplyId: number;
  quantity: Prisma.Decimal;
  supply: { unitCost: Prisma.Decimal | null; deductOnSale: boolean };
};

/** Insumo com custo (CMV) e se sai do estoque na venda (baixa das bebidas). */
const toCosted = (c: CostedRow): SaleComponent => ({
  supplyId: c.supplyId,
  quantity: c.quantity.toString(),
  unitCost: c.supply.unitCost?.toString() ?? null,
  deductOnSale: c.supply.deductOnSale,
});

const saleProductSelect = (businessDate: string) =>
  ({
    id: true,
    name: true,
    menuNumber: true,
    ...datedPriceSelect(businessDate),
    category: { select: { name: true } },
    components: COSTED_COMPONENTS,
    // Combo: os insumos vêm dos itens (CMV da soma dos itens).
    bundleItems: {
      select: {
        quantity: true,
        item: { select: { components: COSTED_COMPONENTS } },
      },
    },
  }) as const satisfies Prisma.ProductSelect;

type SaleProductRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof saleProductSelect>;
}>;

/** Preço e situação do dia do pedido: `sellable()` do pricing continua olhando `active`. */
function toSaleProduct(row: SaleProductRow, businessDate: string): SaleProduct {
  const { salePrice, sellable } = priceOnDate(
    toDatedProduct(row),
    businessDate,
  );
  return {
    id: row.id,
    name: row.name,
    menuNumber: row.menuNumber,
    categoryName: row.category.name,
    salePrice,
    active: sellable,
    components: saleComponentsOf(row),
  };
}

function saleComponentsOf(row: SaleProductRow): SaleComponent[] {
  if (row.bundleItems.length === 0) return row.components.map(toCosted);
  return expandBundle(
    row.bundleItems.map((bundled) => ({
      quantity: bundled.quantity,
      components: bundled.item.components.map(toCosted),
    })),
  );
}

@Injectable()
export class PrismaOrderCatalog implements OrderCatalog {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  findPaymentMethod(id: number): Promise<PaymentMethodEntry | null> {
    return this.prisma.paymentMethod.findUnique({
      where: { id },
      select: { id: true, active: true, isCardTerminal: true },
    });
  }

  async findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null> {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    return (
      zone && { id: zone.id, active: zone.active, fee: zone.fee.toFixed(2) }
    );
  }

  async findProductsForSale(
    ids: number[],
    businessDate: string,
  ): Promise<SaleProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: saleProductSelect(businessDate),
    });
    return rows.map((row) => toSaleProduct(row, businessDate));
  }

  findCustomer(id: number): Promise<CustomerEntry | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        street: true,
        number: true,
        reference: true,
        deliveryZoneId: true,
      },
    });
  }
}
