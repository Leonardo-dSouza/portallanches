import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { SaleProduct } from './order-pricing.js';
import type {
  CustomerEntry,
  DeliveryZoneEntry,
  OrderCatalog,
  PaymentMethodEntry,
} from './order-repository.js';

const SALE_PRODUCT_SELECT = {
  id: true,
  name: true,
  menuNumber: true,
  salePrice: true,
  active: true,
  category: { select: { name: true } },
  components: {
    select: { quantity: true, supply: { select: { unitCost: true } } },
  },
} as const satisfies Prisma.ProductSelect;

type SaleProductRow = Prisma.ProductGetPayload<{
  select: typeof SALE_PRODUCT_SELECT;
}>;

const toSaleProduct = (row: SaleProductRow): SaleProduct => ({
  id: row.id,
  name: row.name,
  menuNumber: row.menuNumber,
  categoryName: row.category.name,
  salePrice: row.salePrice?.toFixed(2) ?? null,
  active: row.active,
  components: row.components.map((c) => ({
    quantity: c.quantity.toString(),
    unitCost: c.supply.unitCost?.toString() ?? null,
  })),
});

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

  async findProductsForSale(ids: number[]): Promise<SaleProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: SALE_PRODUCT_SELECT,
    });
    return rows.map(toSaleProduct);
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
