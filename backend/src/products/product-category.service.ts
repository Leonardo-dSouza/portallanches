import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertCompleteOrder } from '../common/input-parsers.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { IMPORTED_CATEGORY_KEYS } from './imported-categories.js';
import { assertAddonTarget } from './category-addons.js';
import { assertChoiceTarget } from './category-choice.js';
import {
  parseAddonCategoryChoice,
  parseCategoryInput,
  parseCategoryOrder,
  parseChoiceCategoryLink,
  parseProductOrder,
} from './product-category-input.js';
import {
  PRODUCT_CATEGORY_REPOSITORY,
  type CategoryProductOrder,
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
    const all = await this.listContaining(id);
    assertAddonTarget(id, targetId, all);
    return this.toView(await this.categories.setAddonCategory(id, targetId));
  }

  /**
   * Liga a escolha obrigatória dos itens da categoria (2026-11-08: Artesanal → Pão; null desliga).
   *
   * @example await service.setChoiceCategory(2, { choiceCategoryId: 12 })
   */
  async setChoiceCategory(
    id: number,
    body: unknown,
  ): Promise<ProductCategoryView> {
    const targetId = parseChoiceCategoryLink(body);
    const all = await this.listContaining(id);
    assertChoiceTarget(id, targetId, all);
    return this.toView(await this.categories.setChoiceCategory(id, targetId));
  }

  /**
   * Produtos da categoria na ordem das teclas da escolha (Cadastros → Categorias, 2026-11-08).
   *
   * @example await service.listProductOrder(12) // [{ id: 66, name: 'Pão Gergelim', sortOrder: 1 }, …]
   */
  async listProductOrder(id: number): Promise<CategoryProductOrder[]> {
    await this.listContaining(id);
    return this.categories.listProductOrder(id);
  }

  /**
   * Ordem dos produtos da categoria, que vira a tecla 1, 2, 3 da escolha no caixa (pedido do
   * usuário, 2026-11-08: "parametrizável"). Pede todos os produtos dela, inativos também.
   *
   * @example await service.reorderProducts(12, { ids: [66, 67, 65] }) // Gergelim, Brioche, Tradicional
   */
  async reorderProducts(
    id: number,
    body: unknown,
  ): Promise<CategoryProductOrder[]> {
    const ids = parseProductOrder(body);
    await this.listContaining(id);
    const known = (await this.categories.listProductOrder(id)).map((p) => p.id);
    assertCompleteOrder(ids, known);
    await this.categories.reorderProducts(ids);
    return this.categories.listProductOrder(id);
  }

  /** @example await service.reorder({ ids: [3, 1, 2] }) // lista na ordem nova */
  async reorder(body: unknown): Promise<ProductCategoryView[]> {
    const ids = parseCategoryOrder(body);
    const known = (await this.categories.list()).map((c) => c.id);
    assertCompleteOrder(ids, known);
    await this.categories.reorder(ids);
    return this.list();
  }

  /** Todas as categorias; 404 se `id` não está entre elas. */
  private async listContaining(id: number): Promise<CategoryRecord[]> {
    const all = await this.categories.list();
    if (all.some((c) => c.id === id)) return all;
    throw new NotFoundException(`Categoria ${id} não encontrada`);
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
