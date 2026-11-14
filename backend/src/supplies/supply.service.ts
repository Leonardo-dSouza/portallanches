import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { normalizeDecimal } from '../common/quantity.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { parseSupplyInput, type SupplyInput } from './supply-input.js';
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
    const input = parseSupplyInput(body);
    if (input.rawUnitCost !== undefined && input.rawUnitCost !== null) {
      throw new UnprocessableEntityException(
        `Custo de ${input.name} muda em Custos (POST /costs/apply); recebido ${formatReceived(input.rawUnitCost)}, esperado sem custo`,
      );
    }
    const data = await this.validatedData(input);
    if (data.salePrice !== undefined)
      throw new UnprocessableEntityException(
        `Insumo novo "${data.name}" não tem produto no Cardápio: grave o insumo sem salePrice e cadastre o item no Cardápio`,
      );
    return this.supplies.create({ ...data, unitCost: null });
  }

  async update(id: number, body: unknown): Promise<SupplyRecord> {
    const existing = await this.supplies.findById(id);
    if (!existing) throw new NotFoundException(`Insumo ${id} não encontrado`);
    const input = parseSupplyInput(body);
    const unitCost = this.resolveUnitCost(existing, input);
    const data = await this.validatedData(input);
    if (data.salePrice !== undefined) await this.assertSellable(id, data.name);
    // O dia de negócio data o histórico do preço do produto 1:1.
    const today = toBusinessDate(this.clock(), this.timeZone);
    return this.supplies.update(id, { ...data, unitCost }, today);
  }

  private resolveUnitCost(
    existing: SupplyRecord,
    input: SupplyInput,
  ): string | null {
    if (input.rawUnitCost === undefined) return existing.unitCost;
    const currentNorm =
      existing.unitCost === null
        ? null
        : normalizeDecimal(existing.unitCost, 4);
    const receivedNorm =
      input.rawUnitCost === null
        ? null
        : normalizeDecimal(input.rawUnitCost, 4);
    // Os scripts docs/cardapio-2026-10/aplicar-ajustes.sh reenviam o insumo inteiro
    // com o custo atual; manter "igual passa" garante compatibilidade sem alterar o custo em Cadastros.
    if (currentNorm === receivedNorm) return existing.unitCost;
    throw new UnprocessableEntityException(
      `Custo de ${existing.name} muda em Custos (POST /costs/apply); recebido ${formatReceived(input.rawUnitCost)}, atual ${String(existing.unitCost)}`,
    );
  }

  /** Preço de venda só existe para insumo vendido sozinho (produto 1:1, como as bebidas). */
  private async assertSellable(id: number, name: string): Promise<void> {
    if (await this.supplies.findSaleProduct(id)) return;
    throw new UnprocessableEntityException(
      `Insumo "${name}" (${id}) não tem produto 1:1 no Cardápio: preço de venda só vale para item vendido sozinho (1 un do insumo, como as bebidas)`,
    );
  }

  private async validatedData(input: SupplyInput): Promise<SupplyData> {
    const { sectionId } = input;
    if (sectionId !== null && !(await this.supplies.sectionExists(sectionId)))
      throw new UnprocessableEntityException(
        `Seção ${sectionId} não existe: esperado id de GET /supplies/sections`,
      );
    return { ...input, nameKey: toNeighborhoodKey(input.name) };
  }
}

function formatReceived(raw: unknown): string {
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  return JSON.stringify(raw);
}
