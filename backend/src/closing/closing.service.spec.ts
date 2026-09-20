import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DayGroup } from './business-date.js';
import type {
  ClosingRecord,
  ClosingRepository,
  NewClosing,
} from './closing-repository.js';
import { ClosingService } from './closing.service.js';

class FakeClosingRepository implements ClosingRepository {
  readonly records = new Map<string, ClosingRecord>();
  rates: Partial<Record<DayGroup, string>> = {
    TUE_THU: '40.00',
    FRI_SUN: '60.00',
  };

  async findByDate(businessDate: string): Promise<ClosingRecord | null> {
    return this.records.get(businessDate) ?? null;
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
      ...newClosing,
    };
    this.records.set(record.businessDate, record);
    return record;
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

const TUESDAY = new Date(2026, 8, 22, 12);
const MONDAY = new Date(2026, 8, 21, 12);
const FRIDAY = new Date(2026, 8, 25, 12);
const WEDNESDAY = new Date(2026, 8, 23, 12);

function build(now: Date): {
  service: ClosingService;
  repo: FakeClosingRepository;
} {
  const repo = new FakeClosingRepository();
  return { service: new ClosingService(repo, () => now), repo };
}

describe('ClosingService', () => {
  it('cria o fechamento de hoje copiando a diária do grupo', async () => {
    const closing = await build(TUESDAY).service.getOrCreateToday();
    expect(closing).toMatchObject({
      businessDate: '2026-09-22',
      status: 'OPEN',
      motoboyDailyRate: '40.00',
    });
  });

  it('usa a diária de sexta a domingo na sexta', async () => {
    const closing = await build(FRIDAY).service.getOrCreateToday();
    expect(closing.motoboyDailyRate).toBe('60.00');
  });

  it('reaproveita o fechamento existente', async () => {
    const { service } = build(TUESDAY);
    const first = await service.getOrCreateToday();
    expect((await service.getOrCreateToday()).id).toBe(first.id);
  });

  it('recusa segunda-feira', async () => {
    await expect(build(MONDAY).service.getOrCreateToday()).rejects.toThrow(
      /2026-09-21/,
    );
  });

  it('falha se não há diária configurada', async () => {
    const { service, repo } = build(TUESDAY);
    repo.rates = {};
    await expect(service.getOrCreateToday()).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('fecha o dia registrando quem e quando', async () => {
    const closing = await build(TUESDAY).service.closeToday(2);
    expect(closing).toMatchObject({
      status: 'CLOSED',
      closedById: 2,
      closedAt: TUESDAY,
    });
  });

  it('não fecha duas vezes', async () => {
    const { service } = build(TUESDAY);
    await service.closeToday(2);
    await expect(service.closeToday(2)).rejects.toThrow(ConflictException);
  });

  it('admin fecha no dia seguinte o dia que ficou aberto', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateToday();
    const nextDay = new ClosingService(repo, () => WEDNESDAY);
    const closing = await nextDay.closeByDate('2026-09-22', 1);
    expect(closing).toMatchObject({
      businessDate: '2026-09-22',
      status: 'CLOSED',
      closedById: 1,
      closedAt: WEDNESDAY,
    });
  });

  it('closeByDate: 404 sem fechamento e 409 se já fechado', async () => {
    const { service } = build(TUESDAY);
    await expect(service.closeByDate('2026-09-20', 1)).rejects.toThrow(
      NotFoundException,
    );
    await service.closeToday(2);
    await expect(service.closeByDate('2026-09-22', 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('reabre um fechamento fechado registrando o admin', async () => {
    const { service } = build(TUESDAY);
    await service.closeToday(2);
    const reopened = await service.reopen('2026-09-22', 1);
    expect(reopened).toMatchObject({ status: 'OPEN', reopenedById: 1 });
  });

  it('não reabre fechamento que já está aberto', async () => {
    const { service } = build(TUESDAY);
    await service.getOrCreateToday();
    await expect(service.reopen('2026-09-22', 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('listBetween: só fechamentos do intervalo, e rejeita intervalo inválido', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateToday();
    await new ClosingService(repo, () => WEDNESDAY).getOrCreateToday();
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
