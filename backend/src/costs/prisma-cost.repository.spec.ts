import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import {
  toCostHistoryRow,
  toCostProduct,
  toCostSupply,
  toPricingCategory,
  toSupplyRecipe,
} from './prisma-cost.repository.js';

describe('PrismaCostRepository mappers', () => {
  it('converte linha de insumo para CostSupply com decimais normalizados', () => {
    const row = {
      id: 1,
      name: 'Acém',
      countUnit: 'kg',
      unitCost: new Prisma.Decimal('36.9000'),
      basePrice: new Prisma.Decimal('36.90'),
      baseQuantity: new Prisma.Decimal('1.000'),
      baseLabel: 'peça',
      nameKey: 'acem',
      minStock: null,
      deductOnSale: true,
      dailyCount: false,
      sectionId: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      packages: [
        {
          id: 1,
          supplyId: 1,
          name: 'peça',
          quantity: new Prisma.Decimal('5.000'),
        },
      ],
    };

    const result = toCostSupply(row);
    expect(result).toEqual({
      id: 1,
      name: 'Acém',
      countUnit: 'kg',
      sectionId: null,
      unitCost: '36.9',
      basePrice: '36.90',
      baseQuantity: '1',
      baseLabel: 'peça',
      packages: [{ name: 'peça', quantity: '5' }],
    });
  });

  it('converte linha de ficha técnica para SupplyRecipe', () => {
    const row = {
      id: 10,
      supplyId: 10,
      yieldQuantity: new Prisma.Decimal('28.000'),
      items: [
        {
          id: 1,
          recipeId: 10,
          supplyId: 1,
          quantity: new Prisma.Decimal('2.000'),
        },
      ],
    };

    const result = toSupplyRecipe(row);
    expect(result).toEqual({
      supplyId: 10,
      yieldQuantity: '28',
      items: [{ supplyId: 1, quantity: '2' }],
    });
  });

  it('converte linha de produto para CostProduct', () => {
    const row = {
      id: 1,
      name: 'X Salada',
      categoryId: 2,
      menuNumber: 5,
      salePrice: new Prisma.Decimal('25.50'),
      nameKey: 'x-salada',
      description: null,
      sortOrder: 1,
      active: true,
      importSource: null,
      deactivatedOn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      components: [
        {
          id: 1,
          productId: 1,
          supplyId: 10,
          quantity: new Prisma.Decimal('1.000'),
        },
      ],
      bundleItems: [
        { id: 1, bundleProductId: 1, itemProductId: 2, quantity: 1 },
      ],
    };

    const result = toCostProduct(row);
    expect(result).toEqual({
      id: 1,
      name: 'X Salada',
      categoryId: 2,
      menuNumber: 5,
      salePrice: '25.50',
      components: [{ supplyId: 10, quantity: '1' }],
      bundleItems: [{ productId: 2, quantity: 1 }],
    });
  });

  it('converte categoria para PricingCategory com percentuais normalizados', () => {
    const row = {
      id: 1,
      name: 'Artesanais',
      nameKey: 'artesanais',
      sortOrder: 1,
      active: true,
      addonCategoryId: null,
      choiceCategoryId: null,
      fixedCostPercent: new Prisma.Decimal('41.07'),
      profitPercent: new Prisma.Decimal('16.00'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = toPricingCategory(row);
    expect(result).toEqual({
      id: 1,
      name: 'Artesanais',
      sortOrder: 1,
      fixedCostPercent: '41.07',
      profitPercent: '16',
    });
  });

  it('converte linha de histórico para CostHistoryRow com ISO e strings', () => {
    const now = new Date('2026-11-13T20:00:00Z');
    const row = {
      id: 1,
      changeSetId: 8,
      supplyId: 1,
      oldUnitCost: new Prisma.Decimal('36.9000'),
      newUnitCost: new Prisma.Decimal('45.0000'),
      oldBasePrice: new Prisma.Decimal('36.90'),
      newBasePrice: new Prisma.Decimal('45.00'),
      baseQuantity: new Prisma.Decimal('1.000'),
      baseLabel: 'kg',
      changeSet: {
        id: 8,
        createdById: 1,
        createdAt: now,
        summary: 'Acém 36,90 → 45,00',
        createdBy: { name: 'Admin Leo' },
      },
    };

    const result = toCostHistoryRow(row);
    expect(result).toEqual({
      createdAt: now.toISOString(),
      userName: 'Admin Leo',
      oldUnitCost: '36.9',
      newUnitCost: '45',
      oldBasePrice: '36.90',
      newBasePrice: '45.00',
      baseQuantity: '1',
      baseLabel: 'kg',
    });
  });
});
