import type { SessionUser } from '../auth/session-user.js';
import {
  assertCanEditClosing,
  assertCanSelectDate,
} from '../closing/closing-access.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';

export class FakeClosingLookup implements ClosingLookup {
  today: ClosingRecord = {
    id: 10,
    businessDate: '2026-09-22',
    status: 'OPEN',
    motoboyDailyRate: '40.00',
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
  };

  askedDates: (string | undefined)[] = [];

  async getFor(_user: SessionUser, rawDate?: string): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  async getOrCreateFor(
    _user: SessionUser,
    rawDate?: string,
  ): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  /** Id diferente do de hoje = fechamento antigo, fora da noite em andamento do caixa. */
  async getById(id: number): Promise<ClosingRecord> {
    if (id === this.today.id) return this.today;
    return { ...this.today, id, businessDate: '2026-08-01' };
  }

  assertEditable(user: SessionUser, closing: ClosingRecord): void {
    assertCanEditClosing(user, closing, ['2026-09-22']);
  }

  assertViewable(user: SessionUser, closing: ClosingRecord): void {
    assertCanSelectDate(user, closing.businessDate, ['2026-09-22']);
  }

  async getByDate(): Promise<ClosingRecord> {
    return this.today;
  }
}
