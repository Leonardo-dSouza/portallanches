import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { parseSupplyInput } from './supply-input.js';
import {
  SUPPLY_REPOSITORY,
  type SupplyData,
  type SupplyRecord,
  type SupplyRepository,
  type SupplySectionRecord,
} from './supply-repository.js';

/**
 * Cadastro de insumos do estoque. Nome repetido (sem distinguir maiúsculas/acentos) vira 409
 * pela chave única; nada é apagado, o insumo sai de uso com `active = false`.
 */
@Injectable()
export class SupplyService {
  constructor(
    @Inject(SUPPLY_REPOSITORY) private readonly supplies: SupplyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  list(): Promise<SupplyRecord[]> {
    return this.supplies.list();
  }

  listSections(): Promise<SupplySectionRecord[]> {
    return this.supplies.listSections();
  }

  /**
   * @example await service.create({ name: 'Leite condensado', countUnit: 'un', minStock: 4 })
   */
  async create(body: unknown): Promise<SupplyRecord> {
    const data = await this.validatedData(body);
    // Insumo novo ainda não está em produto nenhum: não há onde gravar o preço.
    if (data.salePrice !== undefined)
      throw new UnprocessableEntityException(
        `Insumo novo "${data.name}" não tem produto no Cardápio: grave o insumo sem salePrice e cadastre o item no Cardápio`,
      );
    return this.supplies.create(data);
  }

  async update(id: number, body: unknown): Promise<SupplyRecord> {
    const data = await this.validatedData(body);
    if (!(await this.supplies.exists(id)))
      throw new NotFoundException(`Insumo ${id} não encontrado`);
    if (data.salePrice !== undefined) await this.assertSellable(id, data.name);
    // O dia de negócio data o histórico do preço do produto 1:1.
    const today = toBusinessDate(this.clock(), this.timeZone);
    return this.supplies.update(id, data, today);
  }

  /** Preço de venda só existe para insumo vendido sozinho (produto 1:1, como as bebidas). */
  private async assertSellable(id: number, name: string): Promise<void> {
    if (await this.supplies.findSaleProduct(id)) return;
    throw new UnprocessableEntityException(
      `Insumo "${name}" (${id}) não tem produto 1:1 no Cardápio: preço de venda só vale para item vendido sozinho (1 un do insumo, como as bebidas)`,
    );
  }

  private async validatedData(body: unknown): Promise<SupplyData> {
    const input = parseSupplyInput(body);
    const { sectionId } = input;
    if (sectionId !== null && !(await this.supplies.sectionExists(sectionId)))
      throw new UnprocessableEntityException(
        `Seção ${sectionId} não existe: esperado id de GET /supplies/sections`,
      );
    return { ...input, nameKey: toNeighborhoodKey(input.name) };
  }
}
