import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FakeManagerAuthorizer } from '../auth/auth-fakes.fixture.js';
import type { SessionUser } from '../auth/session-user.js';
import type { DayGroup } from './business-date.js';
import type {
  ClosingRecord,
  ClosingRepository,
  DrawerClosingContext,
  NewClosing,
  OpenOrderRef,
} from './closing-repository.js';
import type {
  DrawerCountItemInput,
  KnownPaymentMethod,
} from './drawer-count-input.js';
import type { DrawerToCountItem } from '../report/drawer-check.js';
import { ClosingService } from './closing.service.js';

class FakeClosingRepository implements ClosingRepository {
  readonly records = new Map<string, ClosingRecord>();
  /** Contas abertas (balcão sem pagamento) de qualquer fechamento. */
  openOrders: OpenOrderRef[] = [];
  toCount: DrawerToCountItem[] = [];
  knownMethods: KnownPaymentMethod[] = [];
  readonly counts = new Map<number, DrawerCountItemInput[]>();

  async listOpenOrders(): Promise<OpenOrderRef[]> {
    return this.openOrders;
  }

  async findDrawerCountContext(): Promise<DrawerClosingContext> {
    const knownMethods =
      this.knownMethods.length > 0
        ? this.knownMethods
        : this.toCount.map((item) => ({
            id: item.paymentMethodId,
            name: item.name,
            isFiado: false,
          }));
    return { toCount: this.toCount, knownMethods };
  }
  rates: Partial<Record<DayGroup, string>> = {
    TUE_THU: '40.00',
    FRI_SUN: '60.00',
  };

  async findByDate(businessDate: string): Promise<ClosingRecord | null> {
    return this.records.get(businessDate) ?? null;
  }

  async findById(id: number): Promise<ClosingRecord | null> {
    return [...this.records.values()].find((r) => r.id === id) ?? null;
  }

  async list(): Promise<ClosingRecord[]> {
    return [...this.records.values()];
  }

  async listBetween(from: string, to: string): Promise<ClosingRecord[]> {
    return [...this.records.values()]
      .filter((r) => r.businessDate >= from && r.businessDate <= to)
      .sort((a, b) => a.businessDate.localeCompare(b.businessDate));
  }

  async findMotoboyRate(dayGroup: DayGroup): Promise<string | null> {
    return this.rates[dayGroup] ?? null;
  }

  async createIfAbsent(newClosing: NewClosing): Promise<ClosingRecord> {
    const record: ClosingRecord = {
      id: this.records.size + 1,
      status: 'OPEN',
      closedById: null,
      closedAt: null,
      reopenedById: null,
      reopenedAt: null,
      notes: null,
      openingCash: null,
      openedById: null,
      openedAt: null,
      countedById: null,
      countedAt: null,
      ...newClosing,
    };
    this.records.set(record.businessDate, record);
    return record;
  }

  async recordOpening(
    id: number,
    amount: string,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    return this.update(id, {
      openingCash: amount,
      openedById: userId,
      openedAt: at,
    });
  }

  async recordFirstOpening(
    id: number,
    amount: string,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord | null> {
    const stored = await this.findById(id);
    if (stored?.openingCash !== null) return null;
    return this.recordOpening(id, amount, userId, at);
  }

  async markClosed(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    return this.update(id, {
      status: 'CLOSED',
      closedById: userId,
      closedAt: at,
    });
  }

  async markClosedWithCount(
    id: number,
    userId: number,
    at: Date,
    counts: DrawerCountItemInput[],
    note: string | null,
  ): Promise<ClosingRecord> {
    this.counts.set(id, counts);
    return this.update(id, {
      status: 'CLOSED',
      closedById: userId,
      closedAt: at,
      countedById: userId,
      countedAt: at,
      notes: note,
    });
  }

  async markReopened(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    return this.update(id, {
      status: 'OPEN',
      reopenedById: userId,
      reopenedAt: at,
    });
  }

  private update(id: number, changes: Partial<ClosingRecord>): ClosingRecord {
    const current = [...this.records.values()].find((r) => r.id === id);
    const updated = { ...current, ...changes } as ClosingRecord;
    this.records.set(updated.businessDate, updated);
    return updated;
  }
}

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const TUESDAY = new Date('2026-09-22T15:00:00Z');
const MONDAY = new Date('2026-09-21T15:00:00Z');
const FRIDAY = new Date('2026-09-25T15:00:00Z');
const WEDNESDAY = new Date('2026-09-23T15:00:00Z');
/** 00:30 de quarta em Brasília: a noite de terça ainda está em andamento. */
const AFTER_MIDNIGHT = new Date('2026-09-23T03:30:00Z');
/** 06:00 de quarta em Brasília: a noite de terça acabou. */
const MORNING = new Date('2026-09-23T09:00:00Z');

function serviceAt(repo: FakeClosingRepository, now: Date): ClosingService {
  return new ClosingService(repo, new FakeManagerAuthorizer(), () => now);
}

function build(now: Date): {
  service: ClosingService;
  repo: FakeClosingRepository;
} {
  const repo = new FakeClosingRepository();
  return { service: serviceAt(repo, now), repo };
}

describe('ClosingService', () => {
  it('cria o fechamento de hoje copiando a diária do grupo', async () => {
    const closing = await build(TUESDAY).service.getOrCreateFor(CAIXA);
    expect(closing).toMatchObject({
      businessDate: '2026-09-22',
      status: 'OPEN',
      motoboyDailyRate: '40.00',
    });
  });

  it('usa a diária de sexta a domingo na sexta', async () => {
    const closing = await build(FRIDAY).service.getOrCreateFor(CAIXA);
    expect(closing.motoboyDailyRate).toBe('60.00');
  });

  it('reaproveita o fechamento existente', async () => {
    const { service } = build(TUESDAY);
    const first = await service.getOrCreateFor(CAIXA);
    expect((await service.getOrCreateFor(CAIXA)).id).toBe(first.id);
  });

  it('abre o dia também na segunda-feira, se decidirem abrir', async () => {
    const closing = await build(MONDAY).service.getOrCreateFor(CAIXA);
    expect(closing.businessDate).toBe('2026-09-21');
  });

  it('usa o fuso da lanchonete: 01h UTC de segunda ainda é domingo', async () => {
    const repo = new FakeClosingRepository();
    const sundayNight = new Date('2026-09-21T01:17:00Z');
    const closing = await serviceAt(repo, sundayNight).getOrCreateFor(CAIXA);
    expect(closing.businessDate).toBe('2026-09-20');
  });

  it('getFor: dia sem lançamentos vem vazio e NÃO grava fechamento', async () => {
    const { service, repo } = build(MONDAY);
    const closing = await service.getFor(CAIXA);
    expect(closing).toMatchObject({
      id: 0,
      businessDate: '2026-09-21',
      status: 'OPEN',
    });
    expect(repo.records.size).toBe(0);
  });

  it('getFor devolve o fechamento existente da data escolhida', async () => {
    const { service } = build(TUESDAY);
    const created = await service.getOrCreateFor(CAIXA);
    expect((await service.getFor(CAIXA, '2026-09-22')).id).toBe(created.id);
  });

  it('caixa só abre a noite em andamento: ontem à tarde e amanhã são 403 (2026-10-15)', async () => {
    const { service } = build(TUESDAY);
    await expect(service.getFor(CAIXA, '2026-09-22')).resolves.toBeDefined();
    await expect(service.getFor(CAIXA, '2026-09-21')).rejects.toThrow(
      /esperado 2026-09-22, recebido 2026-09-21/,
    );
    await expect(service.getFor(CAIXA, '2026-09-23')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('de madrugada, sem data, abre a noite de ontem enquanto ela estiver aberta', async () => {
    const { repo } = build(TUESDAY);
    await serviceAt(repo, TUESDAY).getOrCreateFor(CAIXA);
    const late = serviceAt(repo, AFTER_MIDNIGHT);
    expect((await late.getFor(CAIXA)).businessDate).toBe('2026-09-22');
    expect((await late.getOrCreateFor(CAIXA)).businessDate).toBe('2026-09-22');
    await late.closeFor(CAIXA, { counts: [] });
    expect((await late.getFor(CAIXA)).businessDate).toBe('2026-09-23');
  });

  it('a partir das 6h a noite de ontem sai do caixa, mesmo aberta (o admin fecha)', async () => {
    const { repo } = build(TUESDAY);
    await serviceAt(repo, TUESDAY).getOrCreateFor(CAIXA);
    const morning = serviceAt(repo, MORNING);
    expect((await morning.getFor(CAIXA)).businessDate).toBe('2026-09-23');
    await expect(morning.getFor(CAIXA, '2026-09-22')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('admin escolhe qualquer data', async () => {
    const { service } = build(TUESDAY);
    await expect(service.getFor(ADMIN, '2025-01-01')).resolves.toBeDefined();
    await expect(service.getFor(ADMIN, '2027-01-01')).resolves.toBeDefined();
  });

  it('getOrCreateFor cria o dia escolhido com a diária do grupo daquela data', async () => {
    const { service } = build(TUESDAY);
    const closing = await service.getOrCreateFor(ADMIN, '2026-09-20');
    expect(closing).toMatchObject({
      businessDate: '2026-09-20',
      motoboyDailyRate: '60.00',
    });
  });

  it('recusa data escolhida com formato inválido', async () => {
    await expect(build(TUESDAY).service.getFor(CAIXA, '20/09')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getById: 404 para id inexistente', async () => {
    await expect(build(TUESDAY).service.getById(99)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('falha se não há diária configurada', async () => {
    const { service, repo } = build(TUESDAY);
    repo.rates = {};
    await expect(service.getOrCreateFor(CAIXA)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('fecha o dia registrando quem e quando', async () => {
    const closing = await build(TUESDAY).service.closeFor(CAIXA, {
      counts: [],
    });
    expect(closing).toMatchObject({
      status: 'CLOSED',
      closedById: 2,
      closedAt: TUESDAY,
    });
  });

  it('não fecha duas vezes', async () => {
    const { service } = build(TUESDAY);
    await service.closeFor(CAIXA, { counts: [] });
    await expect(service.closeFor(CAIXA, { counts: [] })).rejects.toThrow(
      ConflictException,
    );
  });

  it('admin fecha no dia seguinte o dia que ficou aberto', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
    const nextDay = serviceAt(repo, WEDNESDAY);
    const closing = await nextDay.closeByDate('2026-09-22', 1);
    expect(closing).toMatchObject({
      businessDate: '2026-09-22',
      status: 'CLOSED',
      closedById: 1,
      closedAt: WEDNESDAY,
    });
  });

  it('não fecha com conta aberta: 409 com o número e o nome de cada uma (2026-10-10)', async () => {
    const { service, repo } = build(TUESDAY);
    repo.openOrders = [
      { dayNumber: 7, customerName: 'Maria' },
      { dayNumber: 9, customerName: 'João' },
    ];
    await expect(service.closeFor(CAIXA)).rejects.toThrow(
      new ConflictException(
        '2 pedidos a pagar (#7 Maria, #9 João): esperado receber antes de fechar o dia',
      ),
    );
    repo.openOrders = [{ dayNumber: 3, customerName: 'Ana' }];
    await expect(service.closeFor(CAIXA)).rejects.toThrow(
      /^1 pedido a pagar \(#3 Ana\)/,
    );
  });

  it('closeByDate: 404 sem fechamento e 409 se já fechado', async () => {
    const { service } = build(TUESDAY);
    await expect(service.closeByDate('2026-09-20', 1)).rejects.toThrow(
      NotFoundException,
    );
    await service.closeFor(CAIXA, { counts: [] });
    await expect(service.closeByDate('2026-09-22', 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('reabre um fechamento fechado registrando o admin', async () => {
    const { service } = build(TUESDAY);
    await service.closeFor(CAIXA, { counts: [] });
    const reopened = await service.reopenFor(ADMIN, '2026-09-22');
    expect(reopened).toMatchObject({ status: 'OPEN', reopenedById: 1 });
  });

  it('não reabre fechamento que já está aberto', async () => {
    const { service } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
    await expect(service.reopenFor(ADMIN, '2026-09-22')).rejects.toThrow(
      ConflictException,
    );
  });

  it('caixa reabre a noite em andamento só com a senha do admin (2026-10-15)', async () => {
    const { service, repo } = build(TUESDAY);
    await service.closeFor(CAIXA, { counts: [] });
    const afterMidnight = serviceAt(repo, AFTER_MIDNIGHT);
    await expect(afterMidnight.reopenFor(CAIXA, '2026-09-22')).rejects.toThrow(
      /MANAGER_REQUIRED/,
    );
    await expect(
      afterMidnight.reopenFor(CAIXA, '2026-09-22', { managerPassword: 'x' }),
    ).rejects.toThrow(/MANAGER_DENIED/);
    const reopened = await afterMidnight.reopenFor(CAIXA, '2026-09-22', {
      managerPassword: 'admin123',
    });
    expect(reopened).toMatchObject({ status: 'OPEN', reopenedById: 2 });
  });

  it('caixa não reabre dia passado, nem com a senha do admin', async () => {
    const { service, repo } = build(TUESDAY);
    await service.closeFor(CAIXA, { counts: [] });
    await expect(
      serviceAt(repo, MORNING).reopenFor(CAIXA, '2026-09-22', {
        managerPassword: 'admin123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('card 7 · abertura da gaveta', () => {
    it('caixa abre 1 vez e na 2ª leva 409 com o valor gravado', async () => {
      const { service } = build(TUESDAY);
      const opened = await service.recordOpeningFor(CAIXA, { amount: '30.00' });
      expect(opened.openingCash).toBe('30.00');
      expect(opened.openedById).toBe(CAIXA.id);

      await expect(
        service.recordOpeningFor(CAIXA, { amount: '40.00' }),
      ).rejects.toThrow(
        new ConflictException(
          'Troco inicial já informado: R$ 30,00; corrigir é com o admin',
        ),
      );
    });

    it('dois aparelhos abrindo juntos: o segundo leva 409 e não sobrescreve', async () => {
      // O 2º leu a noite antes de o 1º gravar (leitura velha, openingCash ainda nulo).
      const { service, repo } = build(TUESDAY);
      await service.recordOpeningFor(CAIXA, { amount: '30.00' });
      const fresh = repo.findByDate.bind(repo);
      repo.findByDate = async (date) => {
        const record = await fresh(date);
        return record && { ...record, openingCash: null };
      };
      await expect(
        service.recordOpeningFor(CAIXA, { amount: '40.00' }),
      ).rejects.toThrow(
        new ConflictException(
          'Troco inicial já informado: R$ 30,00; corrigir é com o admin',
        ),
      );
      expect((await repo.findById(1))?.openingCash).toBe('30.00');
    });

    it('admin pode corrigir o troco inicial quantas vezes quiser', async () => {
      const { service } = build(TUESDAY);
      await service.recordOpeningFor(CAIXA, { amount: '30.00' });
      const corrected = await service.recordOpeningFor(ADMIN, {
        amount: '40.00',
      });
      expect(corrected.openingCash).toBe('40.00');
      expect(corrected.openedById).toBe(ADMIN.id);
    });

    it('admin em dia passado inexistente leva 404 (não cria dia passado)', async () => {
      const { service } = build(TUESDAY);
      await expect(
        service.recordOpeningFor(ADMIN, { amount: '30.00' }, '2026-09-01'),
      ).rejects.toThrow(NotFoundException);
    });

    it('admin pode corrigir troco inicial de dia passado existente', async () => {
      const { service, repo } = build(TUESDAY);
      await service.getOrCreateFor(CAIXA);
      const nextDay = serviceAt(repo, WEDNESDAY);
      const updated = await nextDay.recordOpeningFor(
        ADMIN,
        { amount: '50.00' },
        '2026-09-22',
      );
      expect(updated.openingCash).toBe('50.00');
    });
  });

  describe('card 7 · fechamento com contagem', () => {
    it('fechar a noite em andamento sem contagem dá 400 listando as que faltam', async () => {
      const { service, repo } = build(TUESDAY);
      repo.toCount = [
        { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
        { paymentMethodId: 2, name: 'PIX', isCash: false },
      ];
      await expect(service.closeFor(CAIXA, { counts: [] })).rejects.toThrow(
        new BadRequestException('Falta a contagem de: Dinheiro, PIX'),
      );
    });

    it('dia passado fecha sem contagem e não apaga contagem existente', async () => {
      const { service, repo } = build(TUESDAY);
      repo.toCount = [{ paymentMethodId: 1, name: 'Dinheiro', isCash: true }];
      await service.closeFor(CAIXA, {
        counts: [{ paymentMethodId: 1, amount: '50.00' }],
      });
      const reopened = await service.reopenFor(ADMIN, '2026-09-22');
      expect(reopened.status).toBe('OPEN');

      // Admin fecha como dia passado
      const nextDay = serviceAt(repo, WEDNESDAY);
      const closed = await nextDay.closeByDate('2026-09-22', ADMIN.id);
      expect(closed.status).toBe('CLOSED');
      expect(repo.counts.get(closed.id)).toEqual([
        { paymentMethodId: 1, amount: '50.00' },
      ]);
    });

    it('refechar substitui a contagem anterior', async () => {
      const { service, repo } = build(TUESDAY);
      repo.toCount = [{ paymentMethodId: 1, name: 'Dinheiro', isCash: true }];
      await service.closeFor(CAIXA, {
        counts: [{ paymentMethodId: 1, amount: '50.00' }],
      });
      expect(repo.counts.get(1)).toEqual([
        { paymentMethodId: 1, amount: '50.00' },
      ]);

      await service.reopenFor(ADMIN, '2026-09-22');
      await service.closeFor(CAIXA, {
        counts: [{ paymentMethodId: 1, amount: '60.00' }],
      });
      expect(repo.counts.get(1)).toEqual([
        { paymentMethodId: 1, amount: '60.00' },
      ]);
    });

    it('A pagar ainda dá 409 antes da conferência', async () => {
      const { service, repo } = build(TUESDAY);
      repo.openOrders = [{ dayNumber: 5, customerName: 'Carlos' }];
      repo.toCount = [{ paymentMethodId: 1, name: 'Dinheiro', isCash: true }];
      await expect(service.closeFor(CAIXA, { counts: [] })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('listBetween: só fechamentos do intervalo, e rejeita intervalo inválido', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
    await serviceAt(repo, WEDNESDAY).getOrCreateFor(CAIXA);
    const days = await service.listBetween('2026-09-23', '2026-09-30');
    expect(days.map((d) => d.businessDate)).toEqual(['2026-09-23']);
    await expect(
      service.listBetween('2026-09-30', '2026-09-01'),
    ).rejects.toThrow(BadRequestException);
  });

  it('getByDate: 404 para data sem fechamento e 400 para data inválida', async () => {
    const { service } = build(TUESDAY);
    await expect(service.getByDate('2026-09-01')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.getByDate('01/09')).rejects.toThrow(
      BadRequestException,
    );
  });
});
