import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { parseSupplyInput } from './supply-input.js';
import {
  SUPPLY_REPOSITORY,
  type SupplyData,
  type SupplyRecord,
  type SupplyRepository,
} from './supply-repository.js';

/**
 * Cadastro de insumos do estoque. Nome repetido (sem distinguir maiúsculas/acentos) vira 409
 * pela chave única; nada é apagado, o insumo sai de uso com `active = false`.
 */
@Injectable()
export class SupplyService {
  constructor(
    @Inject(SUPPLY_REPOSITORY) private readonly supplies: SupplyRepository,
  ) {}

  list(): Promise<SupplyRecord[]> {
    return this.supplies.list();
  }

  /**
   * @example await service.create({ name: 'Leite condensado', countUnit: 'un', minStock: 4 })
   */
  async create(body: unknown): Promise<SupplyRecord> {
    return this.supplies.create(toSupplyData(body));
  }

  async update(id: number, body: unknown): Promise<SupplyRecord> {
    const data = toSupplyData(body);
    if (!(await this.supplies.exists(id)))
      throw new NotFoundException(`Insumo ${id} não encontrado`);
    return this.supplies.update(id, data);
  }
}

function toSupplyData(body: unknown): SupplyData {
  const input = parseSupplyInput(body);
  return { ...input, nameKey: toNeighborhoodKey(input.name) };
}
