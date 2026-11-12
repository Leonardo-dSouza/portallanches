import type { SessionUser } from '../auth/session-user.js';
import { ClosingController } from './closing.controller.js';
import type { ClosingRecord } from './closing-repository.js';
import type { ClosingService } from './closing.service.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

const SAMPLE_CLOSING: ClosingRecord = {
  id: 1,
  businessDate: '2026-11-12',
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

class FakeClosingServiceForController {
  lastOpeningArgs: unknown;
  lastCloseArgs: unknown;

  async getFor(): Promise<ClosingRecord> {
    return SAMPLE_CLOSING;
  }

  async recordOpeningFor(
    user: SessionUser,
    body: unknown,
    date?: string,
  ): Promise<ClosingRecord> {
    this.lastOpeningArgs = { user, body, date };
    return { ...SAMPLE_CLOSING, openingCash: '30.00', openedById: user.id };
  }

  async closeFor(
    user: SessionUser,
    body: unknown,
    date?: string,
  ): Promise<ClosingRecord> {
    this.lastCloseArgs = { user, body, date };
    return { ...SAMPLE_CLOSING, status: 'CLOSED' };
  }
}

describe('ClosingController', () => {
  it('openToday repassa corpo e data para recordOpeningFor', async () => {
    const fake = new FakeClosingServiceForController();
    const controller = new ClosingController(fake as unknown as ClosingService);
    const result = await controller.openToday(
      CAIXA,
      { amount: '30.00' },
      '2026-11-12',
    );
    expect(result.openingCash).toBe('30.00');
    expect(fake.lastOpeningArgs).toEqual({
      user: CAIXA,
      body: { amount: '30.00' },
      date: '2026-11-12',
    });
  });

  it('closeToday repassa corpo e data para closeFor', async () => {
    const fake = new FakeClosingServiceForController();
    const controller = new ClosingController(fake as unknown as ClosingService);
    const body = { counts: [{ paymentMethodId: 1, amount: '30.00' }] };
    const result = await controller.closeToday(CAIXA, body, '2026-11-12');
    expect(result.status).toBe('CLOSED');
    expect(fake.lastCloseArgs).toEqual({
      user: CAIXA,
      body,
      date: '2026-11-12',
    });
  });
});
