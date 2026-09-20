import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { assertCanEditClosing } from './closing-access.js';
import type { ClosingRecord } from './closing-repository.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const TODAY: ClosingRecord = {
  id: 10,
  businessDate: '2026-09-22',
  status: 'OPEN',
  motoboyDailyRate: '40.00',
  closedById: null,
  closedAt: null,
  reopenedById: null,
  reopenedAt: null,
  notes: null,
};
const CLOSED_TODAY: ClosingRecord = { ...TODAY, status: 'CLOSED' };

describe('assertCanEditClosing', () => {
  it('caixa edita o fechamento de hoje aberto', () => {
    expect(() => assertCanEditClosing(CAIXA, TODAY, 10)).not.toThrow();
  });

  it('caixa não edita outro dia, citando esperado e recebido', () => {
    expect(() => assertCanEditClosing(CAIXA, TODAY, 5)).toThrow(
      /esperado fechamento 10, recebido 5/,
    );
  });

  it('caixa não edita hoje se estiver fechado', () => {
    expect(() => assertCanEditClosing(CAIXA, CLOSED_TODAY, 10)).toThrow(
      ForbiddenException,
    );
  });

  it('admin edita qualquer dia, mesmo fechado', () => {
    expect(() => assertCanEditClosing(ADMIN, CLOSED_TODAY, 5)).not.toThrow();
  });
});
