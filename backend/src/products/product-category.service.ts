import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { IMPORTED_CATEGORY_KEYS } from './imported-categories.js';
import { assertAddonTarget } from './category-addons.js';
import {
  parseAddonCategoryChoice,
  parseCategoryInput,
  parseCategoryOrder,
} from './product-category-input.js';
import {
  PRODUCT_CATEGORY_REPOSITORY,
  type CategoryRecord,
  type ProductCategoryRepository,
} from './product-category-repository.js';

/** Categoria como a API devolve: `importLocked` = vem das planilhas e não muda de nome. */
export interface ProductCategoryView extends CategoryRecord {
  importLocked: boolean;
}

/**
 * Categorias do cardápio pela tela (pedido do usuário, 2026-10-09: "Combos", "Porções"). Nada
 * é apagado: a categoria sai de uso com `active = false`, sem mexer nos produtos dela.
 */
@Injectable()
export class ProductCategoryService {
  constructor(
    @Inject(PRODUCT_CATEGORY_REPOSITORY)
    private readonly categories: ProductCategoryRepository,
    @Inject(IMPORTED_CATEGORY_KEYS)
    private readonly importedKeys: ReadonlySet<string>,
  ) {}

  async list(): Promise<ProductCategoryView[]> {
    return (await this.categories.list()).map((c) => this.toView(c));
  }

  /** @example await service.create({ name: 'Combos' }) // entra no fim da ordem */
  async create(body: unknown): Promise<ProductCategoryView> {
    const input = parseCategoryInput(body);
    const all = await this.categories.list();
    const sortOrder = Math.max(0, ...all.map((c) => c.sortOrder)) + 1;
    const nameKey = toNeighborhoodKey(input.name);
    return this.toView(
      await this.categories.create({ ...input, nameKey, sortOrder }),
    );
  }

  async update(id: number, body: unknown): Promise<ProductCategoryView> {
    const input = parseCategoryInput(body);
    const existing = await this.categories.findById(id);
    if (!existing)
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    const nameKey = toNeighborhoodKey(input.name);
    if (nameKey !== existing.nameKey) this.assertRenamable(existing);
    return this.toView(await this.categories.update(id, { ...input, nameKey }));
  }

  /**
   * Liga a categoria à categoria de onde vêm os adicionais dos seus itens (null desliga).
   *
   * @example await service.setAddonCategory(1, { addonCategoryId: 3 }) // Tradicional → Adicionais
   */
  async setAddonCategory(
    id: number,
    body: unknown,
  ): Promise<ProductCategoryView> {
    const targetId = parseAddonCategoryChoice(body);
    const all = await this.categories.list();
    if (!all.some((c) => c.id === id))
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    assertAddonTarget(id, targetId, all);
    return this.toView(await this.categories.setAddonCategory(id, targetId));
  }

  /** @example await service.reorder({ ids: [3, 1, 2] }) // lista na ordem nova */
  async reorder(body: unknown): Promise<ProductCategoryView[]> {
    const ids = parseCategoryOrder(body);
    const known = (await this.categories.list()).map((c) => c.id);
    const sameSet =
      ids.length === known.length && known.every((id) => ids.includes(id));
    if (!sameSet)
      throw new UnprocessableEntityException(
        `Ordem com ids ${ids.join(', ')}: esperado exatamente os ids ${[...known].sort((a, b) => a - b).join(', ')}`,
      );
    await this.categories.reorder(ids);
    return this.list();
  }

  private assertRenamable(category: CategoryRecord): void {
    if (!this.importedKeys.has(category.nameKey)) return;
    throw new UnprocessableEntityException(
      `Categoria "${category.name}" vem da planilha e não pode mudar de nome (a importação a procura por ele); esperado só mudar a ordem ou o ativo`,
    );
  }

  private toView(category: CategoryRecord): ProductCategoryView {
    return {
      ...category,
      importLocked: this.importedKeys.has(category.nameKey),
    };
  }
}
