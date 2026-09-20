import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import {
  parseExpenseTypeInput,
  parseNewExpenseTypeInput,
  type ExpenseTypeInput,
} from './expense-type-input.js';
import {
  EXPENSE_TYPE_REPOSITORY,
  type ExpenseTypeData,
  type ExpenseTypeRecord,
  type ExpenseTypeRepository,
} from './expense-type-repository.js';

/** Tipos de gasto: caixa cria na hora; renomear/desativar é só admin. Nada é apagado. */
@Injectable()
export class ExpenseTypeService {
  constructor(
    @Inject(EXPENSE_TYPE_REPOSITORY)
    private readonly types: ExpenseTypeRepository,
  ) {}

  list(): Promise<ExpenseTypeRecord[]> {
    return this.types.list();
  }

  async create(body: unknown): Promise<ExpenseTypeRecord> {
    return this.types.create(toData(parseNewExpenseTypeInput(body)));
  }

  async update(id: number, body: unknown): Promise<ExpenseTypeRecord> {
    return this.types.update(id, toData(parseExpenseTypeInput(body)));
  }

  /** Tipo existente e ativo, exigido para lançar um gasto. */
  async requireActive(id: number): Promise<ExpenseTypeRecord> {
    const found = await this.types.findById(id);
    if (!found)
      throw new NotFoundException(`Tipo de gasto ${id} não encontrado`);
    if (found.active) return found;
    throw new UnprocessableEntityException(
      `Tipo de gasto "${found.name}" (${id}) está inativo: esperado um tipo ativo`,
    );
  }
}

function toData(input: ExpenseTypeInput): ExpenseTypeData {
  return { ...input, nameKey: toNeighborhoodKey(input.name) };
}
