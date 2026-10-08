import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import {
  parseCustomerInput,
  parsePhone,
  parseZoneFilter,
  type CustomerInput,
} from './customer-input.js';
import {
  CUSTOMER_REPOSITORY,
  CUSTOMER_ZONE_CHECK,
  type CustomerRecord,
  type CustomerRepository,
  type CustomerZoneCheck,
} from './customer-repository.js';

// Homônimos que o caixa escolhe numa lista: mais que isso não cabe ao lado da comanda.
const NAME_MATCH_LIMIT = 10;

/**
 * Clientes de entrega. O caixa busca pelo telefone (ou pelo nome, sem telefone) e cadastra
 * ou atualiza na hora do lançamento; o pedido copia os dados, então atualizar aqui não muda
 * pedidos antigos.
 */
@Injectable()
export class CustomerService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    @Inject(CUSTOMER_ZONE_CHECK) private readonly zones: CustomerZoneCheck,
  ) {}

  /**
   * Lista (0 ou 1 cliente) para o telefone informado em qualquer formato.
   *
   * @example await service.searchByPhone('(79) 99999-1234') // [{ id: 1, name: 'Ana', ... }]
   */
  async searchByPhone(rawPhone: unknown): Promise<CustomerRecord[]> {
    const phone = parsePhone(rawPhone);
    if (phone === null) return [];
    const found = await this.customers.findByPhone(phone);
    return found ? [found] : [];
  }

  /**
   * Clientes com o mesmo nome, sem diferenciar acento, maiúsculas e espaços; para o caixa
   * que não tem o telefone. Vários = homônimos que o caixa escolhe pela rua e bairro.
   *
   * @example await service.searchByName('joao silva') // [{ id: 4, name: 'João Silva', ... }]
   */
  async searchByName(rawName: unknown): Promise<CustomerRecord[]> {
    if (typeof rawName !== 'string') return [];
    const nameKey = toNeighborhoodKey(rawName);
    if (!nameKey) return [];
    return this.customers.findByNameKey(nameKey, NAME_MATCH_LIMIT);
  }

  /**
   * Ruas já cadastradas (do bairro, se informado): o caixa escolhe entre elas para a mesma
   * rua não virar duas no ranking de pedidos por rua.
   *
   * @example await service.listStreets('3') // ['Rua A', 'Rua das Flores']
   */
  async listStreets(rawZoneId: unknown): Promise<string[]> {
    return this.customers.listStreets(parseZoneFilter(rawZoneId));
  }

  async create(body: unknown): Promise<CustomerRecord> {
    const input = await this.parseWithActiveZone(body);
    return this.customers.create(input);
  }

  async update(id: number, body: unknown): Promise<CustomerRecord> {
    const input = await this.parseWithActiveZone(body);
    const existing = await this.customers.findById(id);
    if (!existing) throw new NotFoundException(`Cliente ${id} não encontrado`);
    return this.customers.update(id, input);
  }

  private async parseWithActiveZone(body: unknown): Promise<CustomerInput> {
    const input = parseCustomerInput(body);
    if (await this.zones.isActive(input.deliveryZoneId)) return input;
    throw new BadRequestException(
      `Bairro ${input.deliveryZoneId} inexistente ou inativo: esperado id de um bairro ativo em delivery_zones`,
    );
  }
}
