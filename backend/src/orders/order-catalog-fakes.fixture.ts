import type {
  CustomerEntry,
  DeliveryZoneEntry,
  OrderCatalog,
  PaymentMethodEntry,
} from './order-repository.js';
import type { SaleProduct } from './order-pricing.js';

export class FakeOrderCatalog implements OrderCatalog {
  /** 1 ativa, 2 dinheiro, 3 maquininha ativa, 4 fiado (2026-10-25), 9 inativa. */
  async findPaymentMethod(id: number): Promise<PaymentMethodEntry | null> {
    const plain = {
      id,
      active: true,
      isCardTerminal: false,
      isCash: false,
      isFiado: false,
    };
    if (id === 1) return plain;
    if (id === 2) return { ...plain, isCash: true };
    if (id === 3) return { ...plain, isCardTerminal: true };
    if (id === 4) return { ...plain, isFiado: true };
    return id === 9 ? { ...plain, active: false } : null;
  }

  /** Bairro 3 ativo (taxa 3,00), 4 inativo. */
  async findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null> {
    if (id === 3) return { id, active: true, fee: '3.00' };
    return id === 4 ? { id, active: false, fee: '2.00' } : null;
  }

  customers: CustomerEntry[] = [
    {
      id: 5,
      name: 'Ana',
      phone: '79999991234',
      street: 'Rua A',
      number: '123',
      reference: 'casa azul',
      deliveryZoneId: 3,
    },
    {
      id: 6,
      name: 'Bia',
      phone: null,
      street: 'Rua C',
      number: 'S/N',
      reference: null,
      deliveryZoneId: 4,
    },
    // Cliente do balcão (fiado, 2026-10-25): só nome e telefone.
    {
      id: 7,
      name: 'Maria',
      phone: '79988881111',
      street: null,
      number: null,
      reference: null,
      deliveryZoneId: null,
    },
  ];

  async findCustomer(id: number): Promise<CustomerEntry | null> {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  /**
   * X Salada (9) a R$ 17,80 (aceita os Adicionais, categoria 3), Coca 600 (60) a R$ 7,00,
   * Guaraná lata (61, com baixa no estoque), Add bacon (33) a R$ 6,00, X Egg (11) a R$ 19,00 com
   * ovo e hambúrguer na baixa e Add ovo (34); o preço muda no meio de alguns testes. O X Salada
   * artesanal (29) pede o pão (categoria 12, 2026-11-08): Pão Tradicional (65, com baixa) e Pão
   * Brioche (67, sem baixa), a R$ 0.
   */
  products: SaleProduct[] = [
    {
      id: 9,
      name: 'X Salada',
      menuNumber: 9,
      categoryId: 1,
      categoryName: 'Tradicional',
      categorySortOrder: 1,
      addonCategoryId: 3,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '17.80',
      active: true,
      components: [
        { supplyId: 7, quantity: '1', unitCost: '2.44', deductOnSale: false },
      ],
      removables: [],
    },
    {
      id: 60,
      name: 'Coca Cola 600ml',
      menuNumber: null,
      categoryId: 4,
      categoryName: 'Refrigerantes',
      categorySortOrder: 4,
      addonCategoryId: null,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '7.00',
      active: true,
      components: [],
      removables: [],
    },
    {
      id: 61,
      name: 'Guaraná lata',
      menuNumber: null,
      categoryId: 4,
      categoryName: 'Refrigerantes',
      categorySortOrder: 4,
      addonCategoryId: null,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '6.00',
      active: true,
      components: [
        { supplyId: 30, quantity: '1', unitCost: '3.10', deductOnSale: true },
      ],
      removables: [],
    },
    {
      id: 33,
      name: 'Add bacon',
      menuNumber: null,
      categoryId: 3,
      categoryName: 'Adicionais',
      categorySortOrder: 3,
      addonCategoryId: null,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '6.00',
      active: true,
      components: [
        { supplyId: 12, quantity: '0.03', unitCost: '50', deductOnSale: false },
      ],
      removables: [],
    },
    {
      id: 11,
      name: 'X Egg',
      menuNumber: 11,
      categoryId: 1,
      categoryName: 'Tradicional',
      categorySortOrder: 1,
      addonCategoryId: 3,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '19.00',
      active: true,
      components: [
        { supplyId: 40, quantity: '1', unitCost: '0.90', deductOnSale: true },
        { supplyId: 41, quantity: '1', unitCost: '2.00', deductOnSale: true },
      ],
      removables: [
        { supplyId: 40, name: 'Ovo' },
        { supplyId: 41, name: 'Hambúrguer 56g' },
      ],
    },
    {
      id: 34,
      name: 'Add ovo',
      menuNumber: null,
      categoryId: 3,
      categoryName: 'Adicionais',
      categorySortOrder: 3,
      addonCategoryId: null,
      choiceCategoryId: null,
      choiceCategoryName: null,
      isBundle: false,
      salePrice: '2.50',
      active: true,
      components: [
        { supplyId: 40, quantity: '1', unitCost: '0.90', deductOnSale: true },
      ],
      removables: [],
    },
    {
      id: 29,
      name: 'X Salada',
      menuNumber: 9,
      categoryId: 2,
      categoryName: 'Artesanal',
      categorySortOrder: 2,
      addonCategoryId: 3,
      choiceCategoryId: 12,
      choiceCategoryName: 'Pão',
      isBundle: false,
      salePrice: '33.80',
      active: true,
      components: [
        { supplyId: 50, quantity: '1', unitCost: '8.00', deductOnSale: false },
      ],
      removables: [],
    },
    breadProduct(65, 'Pão Tradicional', 20, '1.40', true),
    breadProduct(67, 'Pão Brioche', 47, '2.67', false),
  ];

  /** Dia de negócio de cada consulta: o preço vem do dia do caixa, não de hoje. */
  readonly pricedOn: string[] = [];

  async findProductsForSale(
    ids: number[],
    businessDate: string,
  ): Promise<SaleProduct[]> {
    this.pricedOn.push(businessDate);
    return this.products.filter((p) => ids.includes(p.id));
  }
}

/** Opção da categoria Pão (12): R$ 0 e 1 un do pão na composição. */
function breadProduct(
  id: number,
  name: string,
  supplyId: number,
  unitCost: string,
  deductOnSale: boolean,
): SaleProduct {
  return {
    id,
    name,
    menuNumber: null,
    categoryId: 12,
    categoryName: 'Pão',
    categorySortOrder: 12,
    addonCategoryId: null,
    choiceCategoryId: null,
    choiceCategoryName: null,
    isBundle: false,
    salePrice: '0.00',
    active: true,
    components: [{ supplyId, quantity: '1', unitCost, deductOnSale }],
    removables: [],
  };
}
