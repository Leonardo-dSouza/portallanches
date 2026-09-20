import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import {
  assertOperatingDay,
  dayGroupOf,
  parseBusinessDate,
  parseDateRange,
  toBusinessDate,
} from './business-date.js';
import {
  CLOSING_REPOSITORY,
  type ClosingRecord,
  type ClosingRepository,
} from './closing-repository.js';

@Injectable()
export class ClosingService {
  constructor(
    @Inject(CLOSING_REPOSITORY) private readonly closings: ClosingRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Fechamento de hoje; cria (com a diária vigente copiada) no primeiro acesso.
   *
   * @example const closing = await service.getOrCreateToday();
   */
  async getOrCreateToday(): Promise<ClosingRecord> {
    const today = toBusinessDate(this.clock());
    assertOperatingDay(today);
    const existing = await this.closings.findByDate(today);
    if (existing) return existing;
    const motoboyDailyRate = await this.currentMotoboyRate(today);
    return this.closings.createIfAbsent({
      businessDate: today,
      motoboyDailyRate,
    });
  }

  async closeToday(userId: number): Promise<ClosingRecord> {
    return this.closeClosing(await this.getOrCreateToday(), userId);
  }

  /**
   * Só admin: fecha um dia que ficou aberto (ex.: o caixa esqueceu de fechar antes
   * da meia-noite). O dia precisa já existir; nada é criado para datas passadas.
   *
   * @example await service.closeByDate('2026-09-19', adminId);
   */
  async closeByDate(rawDate: string, userId: number): Promise<ClosingRecord> {
    return this.closeClosing(await this.getByDate(rawDate), userId);
  }

  /** Só admin: a rota que chama este método exige o perfil ADMIN. */
  async reopen(rawDate: string, userId: number): Promise<ClosingRecord> {
    const closing = await this.getByDate(rawDate);
    if (closing.status === 'OPEN') {
      throw new ConflictException(
        `O fechamento de ${closing.businessDate} já está aberto: esperado status CLOSED`,
      );
    }
    return this.closings.markReopened(closing.id, userId, this.clock());
  }

  async getByDate(rawDate: string): Promise<ClosingRecord> {
    const businessDate = parseBusinessDate(rawDate);
    const closing = await this.closings.findByDate(businessDate);
    if (closing) return closing;
    throw new NotFoundException(`Sem fechamento na data ${businessDate}`);
  }

  list(): Promise<ClosingRecord[]> {
    return this.closings.list();
  }

  /** Fechamentos existentes no intervalo (dias sem movimento não têm registro). */
  async listBetween(
    rawFrom: string | undefined,
    rawTo: string | undefined,
  ): Promise<ClosingRecord[]> {
    const { from, to } = parseDateRange(rawFrom, rawTo);
    return this.closings.listBetween(from, to);
  }

  private closeClosing(
    closing: ClosingRecord,
    userId: number,
  ): Promise<ClosingRecord> {
    if (closing.status === 'CLOSED') {
      throw new ConflictException(
        `O fechamento de ${closing.businessDate} já está fechado: esperado status OPEN`,
      );
    }
    return this.closings.markClosed(closing.id, userId, this.clock());
  }

  private async currentMotoboyRate(businessDate: string): Promise<string> {
    const dayGroup = dayGroupOf(businessDate);
    const rate = await this.closings.findMotoboyRate(dayGroup, businessDate);
    if (rate !== null) return rate;
    throw new UnprocessableEntityException(
      `Diária do motoboy não configurada para o grupo ${dayGroup} em ${businessDate}: cadastre um valor em motoboy_rate_settings`,
    );
  }
}
