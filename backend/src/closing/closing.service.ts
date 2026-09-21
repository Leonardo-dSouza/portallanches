import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import {
  DEFAULT_BUSINESS_TIMEZONE,
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
import { assertCanEditClosing, assertCanSelectDate } from './closing-access.js';

/** Dia sem lançamentos: existe só na resposta, nada é gravado até o primeiro lançamento. */
function emptyClosing(businessDate: string): ClosingRecord {
  return {
    id: 0,
    businessDate,
    status: 'OPEN',
    motoboyDailyRate: '0.00',
    closedById: null,
    closedAt: null,
    reopenedById: null,
    reopenedAt: null,
    notes: null,
  };
}

@Injectable()
export class ClosingService {
  constructor(
    @Inject(CLOSING_REPOSITORY) private readonly closings: ClosingRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE)
    private readonly timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
  ) {}

  /**
   * Fechamento da data escolhida (sem data = hoje) só para consulta: se o dia não tem
   * lançamentos devolve um fechamento vazio (`id` 0), sem gravar. Assim abrir o app numa
   * segunda ou navegar pelo calendário não cria dias vazios que somariam a diária do motoboy.
   *
   * @example const closing = await service.getFor(user, '2026-09-20');
   */
  async getFor(user: SessionUser, rawDate?: string): Promise<ClosingRecord> {
    const businessDate = this.selectedDate(user, rawDate);
    const existing = await this.closings.findByDate(businessDate);
    return existing ?? emptyClosing(businessDate);
  }

  /**
   * Fechamento da data escolhida para lançar; cria (com a diária vigente copiada) no
   * primeiro lançamento.
   *
   * @example const closing = await service.getOrCreateFor(user);
   */
  async getOrCreateFor(
    user: SessionUser,
    rawDate?: string,
  ): Promise<ClosingRecord> {
    const businessDate = this.selectedDate(user, rawDate);
    const existing = await this.closings.findByDate(businessDate);
    if (existing) return existing;
    const motoboyDailyRate = await this.currentMotoboyRate(businessDate);
    return this.closings.createIfAbsent({ businessDate, motoboyDailyRate });
  }

  async getById(id: number): Promise<ClosingRecord> {
    const closing = await this.closings.findById(id);
    if (closing) return closing;
    throw new NotFoundException(`Fechamento ${id} não encontrado`);
  }

  assertEditable(user: SessionUser, closing: ClosingRecord): void {
    assertCanEditClosing(user, closing, this.todayDate());
  }

  async closeFor(user: SessionUser, rawDate?: string): Promise<ClosingRecord> {
    return this.closeClosing(await this.getOrCreateFor(user, rawDate), user.id);
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

  private todayDate(): string {
    return toBusinessDate(this.clock(), this.timeZone);
  }

  private selectedDate(user: SessionUser, rawDate?: string): string {
    const today = this.todayDate();
    const businessDate =
      rawDate === undefined ? today : parseBusinessDate(rawDate);
    assertCanSelectDate(user, businessDate, today);
    return businessDate;
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
