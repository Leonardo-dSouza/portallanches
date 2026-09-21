import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { assertCanEditClosing, assertCanSelectDate } from './closing-access.js';
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

const NOW = '2026-09-22';

describe('assertCanSelectDate', () => {
  it('caixa: hoje e 7 dias atrás passam; 8 dias atrás e amanhã não', () => {
    expect(() => assertCanSelectDate(CAIXA, '2026-09-22', NOW)).not.toThrow();
    expect(() => assertCanSelectDate(CAIXA, '2026-09-15', NOW)).not.toThrow();
    expect(() => assertCanSelectDate(CAIXA, '2026-09-14', NOW)).toThrow(
      /entre 2026-09-15 e 2026-09-22, recebido 2026-09-14/,
    );
    expect(() => assertCanSelectDate(CAIXA, '2026-09-23', NOW)).toThrow(
      ForbiddenException,
    );
  });

  it('admin: qualquer data', () => {
    expect(() => assertCanSelectDate(ADMIN, '2020-01-01', NOW)).not.toThrow();
  });
});

describe('assertCanEditClosing', () => {
  it('caixa edita fechamento aberto dentro da janela, inclusive de dias anteriores', () => {
    expect(() => assertCanEditClosing(CAIXA, TODAY, NOW)).not.toThrow();
    const older = { ...TODAY, businessDate: '2026-09-18' };
    expect(() => assertCanEditClosing(CAIXA, older, NOW)).not.toThrow();
  });

  it('caixa não edita fechamento fora da janela', () => {
    const old = { ...TODAY, businessDate: '2026-08-01' };
    expect(() => assertCanEditClosing(CAIXA, old, NOW)).toThrow(/2026-08-01/);
  });

  it('caixa não edita fechamento fechado', () => {
    expect(() => assertCanEditClosing(CAIXA, CLOSED_TODAY, NOW)).toThrow(
      ForbiddenException,
    );
  });

  it('admin edita qualquer dia, mesmo fechado', () => {
    const old = { ...CLOSED_TODAY, businessDate: '2020-01-01' };
    expect(() => assertCanEditClosing(ADMIN, old, NOW)).not.toThrow();
  });
});
