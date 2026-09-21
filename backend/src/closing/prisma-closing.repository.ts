import { Inject, Injectable } from '@nestjs/common';
import { DailyClosing, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { DayGroup } from './business-date.js';
import type {
  ClosingRecord,
  ClosingRepository,
  NewClosing,
} from './closing-repository.js';

function toRecord(row: DailyClosing): ClosingRecord {
  return {
    ...row,
    businessDate: row.businessDate.toISOString().slice(0, 10),
    motoboyDailyRate: row.motoboyDailyRate.toFixed(2),
  };
}

const toDbDate = (businessDate: string): Date =>
  new Date(`${businessDate}T00:00:00Z`);

@Injectable()
export class PrismaClosingRepository implements ClosingRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async findByDate(businessDate: string): Promise<ClosingRecord | null> {
    const row = await this.prisma.dailyClosing.findUnique({
      where: { businessDate: toDbDate(businessDate) },
    });
    return row && toRecord(row);
  }

  async findById(id: number): Promise<ClosingRecord | null> {
    const row = await this.prisma.dailyClosing.findUnique({ where: { id } });
    return row && toRecord(row);
  }

  async list(): Promise<ClosingRecord[]> {
    const rows = await this.prisma.dailyClosing.findMany({
      orderBy: { businessDate: 'desc' },
    });
    return rows.map(toRecord);
  }

  async listBetween(from: string, to: string): Promise<ClosingRecord[]> {
    const rows = await this.prisma.dailyClosing.findMany({
      where: { businessDate: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: { businessDate: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findMotoboyRate(
    dayGroup: DayGroup,
    businessDate: string,
  ): Promise<string | null> {
    const setting = await this.prisma.motoboyRateSetting.findFirst({
      where: { dayGroup, effectiveFrom: { lte: toDbDate(businessDate) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    return setting?.amount.toFixed(2) ?? null;
  }

  async createIfAbsent(newClosing: NewClosing): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.upsert({
      where: { businessDate: toDbDate(newClosing.businessDate) },
      update: {},
      create: {
        businessDate: toDbDate(newClosing.businessDate),
        motoboyDailyRate: newClosing.motoboyDailyRate,
      },
    });
    return toRecord(row);
  }

  async markClosed(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.update({
      where: { id },
      data: { status: 'CLOSED', closedById: userId, closedAt: at },
    });
    return toRecord(row);
  }

  async markReopened(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.update({
      where: { id },
      data: { status: 'OPEN', reopenedById: userId, reopenedAt: at },
    });
    return toRecord(row);
  }
}
