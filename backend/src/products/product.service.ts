import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseBusinessDate, toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { isLiveNight } from '../closing/live-night.js';
import {
  SETTINGS_READER,
  type SettingsReader,
} from '../settings/app-settings.service.js';
import { expandBundle } from './bundle.js';
import { cmvPercent, computeCmv, type CostedComponent } from './cmv.js';
import type { ProductLineInput } from '../common/product-lines.js';
import { normalizeDecimal } from '../common/quantity.js';
import {
  parseProductInput,
  type ProductComponentInput,
  type ProductInput,
} from './product-input.js';
import {
  saleMenuOn,
  type DatedMenuEntry,
  type MenuStock,
  type SaleMenuItem,
} from './sale-menu.js';
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
    @Inject(SETTINGS_READER) private readonly settings: SettingsReader,
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
    const stock = await this.menuStock(businessDate, entries);
    return saleMenuOn(entries, businessDate, stock);
  }

  /** Saldo das bebidas para o aviso do caixa; null no dia que não mexe no estoque. */
  private async menuStock(
    businessDate: string,
    entries: DatedMenuEntry[],
  ): Promise<MenuStock | null> {
    if (!isLiveNight(businessDate, this.clock(), this.timeZone)) return null;
    const { lowStockWarning } = await this.settings.read();
    if (lowStockWarning === 0) return null;
    const ids = entries.flatMap((e) =>
      e.stockComponents.map((c) => c.supplyId),
    );
    const balances = await this.products.stockBalances([...new Set(ids)]);
    return { balances, warnBelow: lowStockWarning };
  }

  /**
   * @example await service.create({ categoryId: 1, name: 'X Salada', salePrice: 17.8, components: [] })
   */
  async create(body: unknown): Promise<ProductView> {
    const input = parseProductInput(body);
    if (input.components !== undefined && input.components.length > 0) {
      throw new UnprocessableEntityException(
        `Receita de ${input.name} muda em Custos (POST /costs/apply); esperado components ausente ou []`,
      );
    }
    await this.assertBundle(null, input.bundleItems);
    const data = await this.validatedData(input, []);
    return toProductView(await this.products.create(data));
  }

  async update(id: number, body: unknown): Promise<ProductView> {
    const existing = await this.products.findById(id);
    if (!existing) throw new NotFoundException(`Produto ${id} não encontrado`);
    const input = parseProductInput(body);
    await this.assertBundle(id, input.bundleItems);
    const components = this.resolveComponents(existing, input);
    const data = await this.validatedData(input, components);
    const today = this.today();
    return toProductView(await this.products.update(id, data, today));
  }

  private resolveComponents(
    existing: ProductRecord,
    input: ProductInput,
  ): ProductComponentInput[] {
    if (input.bundleItems.length > 0 && existing.bundleItems.length > 0) {
      return [];
    }
    const current = existing.components.map((c) => ({
      supplyId: c.supplyId,
      quantity: c.quantity,
    }));
    if (input.components === undefined) return current;
    if (areComponentsEqual(input.components, existing.components))
      return current;
    throw new UnprocessableEntityException(
      `Receita de ${existing.name} muda em Custos (POST /costs/apply); esperado components ausente ou igual ao atual`,
    );
  }

  private today(): string {
    return toBusinessDate(this.clock(), this.timeZone);
  }

  /** `productId` null = produto novo. */
  private async validatedData(
    input: ProductInput,
    components: ProductComponentInput[],
  ): Promise<ProductData> {
    if (!(await this.products.categoryExists(input.categoryId)))
      throw new UnprocessableEntityException(
        `Categoria ${input.categoryId} não existe: esperado id de GET /product-categories`,
      );
    await this.assertSuppliesExist(components.map((c) => c.supplyId));
    return {
      ...input,
      components,
      nameKey: toNeighborhoodKey(input.name),
    };
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

function areComponentsEqual(
  received: ProductComponentInput[],
  current: ProductRecord['components'],
): boolean {
  if (received.length !== current.length) return false;
  for (const item of received) {
    const found = current.find((c) => c.supplyId === item.supplyId);
    if (!found) return false;
    if (
      normalizeDecimal(item.quantity, 3) !== normalizeDecimal(found.quantity, 3)
    ) {
      return false;
    }
  }
  return true;
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
