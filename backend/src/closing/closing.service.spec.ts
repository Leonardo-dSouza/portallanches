import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
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

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const TUESDAY = new Date('2026-09-22T15:00:00Z');
const MONDAY = new Date('2026-09-21T15:00:00Z');
const FRIDAY = new Date('2026-09-25T15:00:00Z');
const WEDNESDAY = new Date('2026-09-23T15:00:00Z');

function build(now: Date): {
  service: ClosingService;
  repo: FakeClosingRepository;
} {
  const repo = new FakeClosingRepository();
  return { service: new ClosingService(repo, () => now), repo };
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
    const closing = await new ClosingService(
      repo,
      () => sundayNight,
    ).getOrCreateFor(CAIXA);
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

  it('caixa escolhe hoje e até 7 dias atrás; fora disso é 403', async () => {
    const { service } = build(TUESDAY);
    await expect(service.getFor(CAIXA, '2026-09-15')).resolves.toBeDefined();
    await expect(service.getFor(CAIXA, '2026-09-14')).rejects.toThrow(
      /entre 2026-09-15 e 2026-09-22, recebido 2026-09-14/,
    );
    await expect(service.getFor(CAIXA, '2026-09-23')).rejects.toThrow(
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
    const closing = await service.getOrCreateFor(CAIXA, '2026-09-20');
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
    const closing = await build(TUESDAY).service.closeFor(CAIXA);
    expect(closing).toMatchObject({
      status: 'CLOSED',
      closedById: 2,
      closedAt: TUESDAY,
    });
  });

  it('não fecha duas vezes', async () => {
    const { service } = build(TUESDAY);
    await service.closeFor(CAIXA);
    await expect(service.closeFor(CAIXA)).rejects.toThrow(ConflictException);
  });

  it('admin fecha no dia seguinte o dia que ficou aberto', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
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
    await service.closeFor(CAIXA);
    await expect(service.closeByDate('2026-09-22', 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('reabre um fechamento fechado registrando o admin', async () => {
    const { service } = build(TUESDAY);
    await service.closeFor(CAIXA);
    const reopened = await service.reopen('2026-09-22', 1);
    expect(reopened).toMatchObject({ status: 'OPEN', reopenedById: 1 });
  });

  it('não reabre fechamento que já está aberto', async () => {
    const { service } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
    await expect(service.reopen('2026-09-22', 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('listBetween: só fechamentos do intervalo, e rejeita intervalo inválido', async () => {
    const { service, repo } = build(TUESDAY);
    await service.getOrCreateFor(CAIXA);
    await new ClosingService(repo, () => WEDNESDAY).getOrCreateFor(CAIXA);
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
