import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseBusinessDate, toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { expandBundle } from './bundle.js';
import { cmvPercent, computeCmv, type CostedComponent } from './cmv.js';
import type { ProductLineInput } from '../common/product-lines.js';
import { parseProductInput } from './product-input.js';
import { saleMenuOn, type SaleMenuItem } from './sale-menu.js';
import {
  PRODUCT_REPOSITORY,
  type ProductData,
  type ProductRecord,
  type ProductRepository,
} from './product-repository.js';

/** Produto como a API devolve: o CMV é calculado na leitura com o custo atual dos insumos. */
export interface ProductView extends ProductRecord {
  cmv: string;
  /** False se algum insumo da composição não tem custo (CMV abaixo do real). */
  cmvComplete: boolean;
  /** CMV ÷ preço de venda em %, 1 casa; null sem preço. */
  cmvPercent: string | null;
}

/**
 * Cardápio: produtos por categoria com composição e CMV. Nome repetido na mesma categoria
 * vira 409 pela chave única; nada é apagado, o produto sai de uso com `active = false`.
 */
@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  async list(): Promise<ProductView[]> {
    return (await this.products.list()).map(toProductView);
  }

  /**
   * Cardápio do caixa no dia escolhido (padrão: hoje): o que vendia naquele dia, com o preço
   * da época. Caixa atrasado lançado depois do reajuste mostra a prévia certa.
   *
   * @example await service.listForSale('2026-10-05')
   */
  async listForSale(rawDate?: string): Promise<SaleMenuItem[]> {
    const businessDate =
      rawDate === undefined ? this.today() : parseBusinessDate(rawDate);
    const entries = await this.products.listDatedMenu(businessDate);
    return saleMenuOn(entries, businessDate);
  }

  /**
   * @example await service.create({ categoryId: 1, name: 'X Salada', salePrice: 17.8, components: [] })
   */
  async create(body: unknown): Promise<ProductView> {
    const data = await this.validatedData(body, null);
    return toProductView(await this.products.create(data));
  }

  async update(id: number, body: unknown): Promise<ProductView> {
    if (!(await this.products.exists(id)))
      throw new NotFoundException(`Produto ${id} não encontrado`);
    const data = await this.validatedData(body, id);
    const today = this.today();
    return toProductView(await this.products.update(id, data, today));
  }

  private today(): string {
    return toBusinessDate(this.clock(), this.timeZone);
  }

  /** `productId` null = produto novo. */
  private async validatedData(
    body: unknown,
    productId: number | null,
  ): Promise<ProductData> {
    const input = parseProductInput(body);
    await this.assertBundle(productId, input.bundleItems);
    if (!(await this.products.categoryExists(input.categoryId)))
      throw new UnprocessableEntityException(
        `Categoria ${input.categoryId} não existe: esperado id de GET /product-categories`,
      );
    await this.assertSuppliesExist(input.components.map((c) => c.supplyId));
    return { ...input, nameKey: toNeighborhoodKey(input.name) };
  }

  /** Itens do combo existem, não são combos nem o próprio produto; item de combo não vira combo. */
  private async assertBundle(
    productId: number | null,
    items: ProductLineInput[],
  ): Promise<void> {
    if (items.length === 0) return;
    const ids = items.map((item) => item.productId);
    if (productId !== null && ids.includes(productId))
      throw comboError(
        `Combo ${productId} contém a si mesmo`,
        'outros produtos',
      );
    const facts = await this.products.bundleFacts(productId, ids);
    if (facts.missing.length > 0)
      throw comboError(
        `Itens inexistentes no combo: ${facts.missing.join(', ')}`,
        'ids de GET /products',
      );
    if (facts.combos.length > 0)
      throw comboError(
        `Itens que já são combos: ${facts.combos.join(', ')}`,
        'só produtos comuns (combo de um nível)',
      );
    if (facts.usedInCombo)
      throw comboError(
        `Produto ${productId} está dentro de um combo e não pode virar combo`,
        'tirar o item dos combos antes',
      );
  }

  private async assertSuppliesExist(supplyIds: number[]): Promise<void> {
    const missing = await this.products.missingSupplyIds(supplyIds);
    if (missing.length === 0) return;
    throw new UnprocessableEntityException(
      `Insumos inexistentes na composição: ${missing.join(', ')}; esperado ids de GET /supplies`,
    );
  }
}

/** Insumos que dão o CMV: os do produto, ou os dos itens se for combo. */
function costedComponentsOf(record: ProductRecord): CostedComponent[] {
  if (record.bundleItems.length === 0) return record.components;
  return expandBundle(record.bundleItems);
}

function comboError(
  problem: string,
  expected: string,
): UnprocessableEntityException {
  return new UnprocessableEntityException(`${problem}; esperado ${expected}`);
}

function toProductView(record: ProductRecord): ProductView {
  const { cmv, complete } = computeCmv(costedComponentsOf(record));
  return {
    ...record,
    cmv,
    cmvComplete: complete,
    cmvPercent: cmvPercent(cmv, record.salePrice),
  };
}
