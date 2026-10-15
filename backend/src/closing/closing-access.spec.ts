import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  assertCanEditClosing,
  assertCanReopen,
  assertCanSelectDate,
} from './closing-access.js';
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

/** À noite: só hoje. De madrugada: hoje e a noite de ontem (`liveNightDates`). */
const NIGHT = ['2026-09-22'];
const AFTER_MIDNIGHT = ['2026-09-23', '2026-09-22'];

describe('assertCanSelectDate', () => {
  it('caixa: só a noite em andamento (2026-10-15)', () => {
    expect(() => assertCanSelectDate(CAIXA, '2026-09-22', NIGHT)).not.toThrow();
    expect(() =>
      assertCanSelectDate(CAIXA, '2026-09-22', AFTER_MIDNIGHT),
    ).not.toThrow();
    expect(() => assertCanSelectDate(CAIXA, '2026-09-21', NIGHT)).toThrow(
      /esperado 2026-09-22, recebido 2026-09-21/,
    );
    expect(() => assertCanSelectDate(CAIXA, '2026-09-23', NIGHT)).toThrow(
      ForbiddenException,
    );
  });

  it('admin: qualquer data', () => {
    expect(() => assertCanSelectDate(ADMIN, '2020-01-01', NIGHT)).not.toThrow();
  });
});

describe('assertCanEditClosing', () => {
  it('caixa edita o fechamento aberto da noite em andamento, também depois da meia-noite', () => {
    expect(() => assertCanEditClosing(CAIXA, TODAY, NIGHT)).not.toThrow();
    expect(() =>
      assertCanEditClosing(CAIXA, TODAY, AFTER_MIDNIGHT),
    ).not.toThrow();
  });

  it('caixa não edita dia passado', () => {
    const older = { ...TODAY, businessDate: '2026-09-18' };
    expect(() => assertCanEditClosing(CAIXA, older, NIGHT)).toThrow(
      /2026-09-18/,
    );
  });

  it('caixa não edita fechamento fechado', () => {
    expect(() => assertCanEditClosing(CAIXA, CLOSED_TODAY, NIGHT)).toThrow(
      ForbiddenException,
    );
  });

  it('admin edita qualquer dia, mesmo fechado', () => {
    const old = { ...CLOSED_TODAY, businessDate: '2020-01-01' };
    expect(() => assertCanEditClosing(ADMIN, old, NIGHT)).not.toThrow();
  });
});

describe('assertCanReopen', () => {
  it('caixa: só a noite em andamento (a senha do admin o serviço confere)', () => {
    expect(() =>
      assertCanReopen(CAIXA, CLOSED_TODAY, AFTER_MIDNIGHT),
    ).not.toThrow();
    const monday = { ...CLOSED_TODAY, businessDate: '2026-09-21' };
    expect(() => assertCanReopen(CAIXA, monday, NIGHT)).toThrow(
      ForbiddenException,
    );
  });

  it('admin reabre qualquer dia', () => {
    const old = { ...CLOSED_TODAY, businessDate: '2020-01-01' };
    expect(() => assertCanReopen(ADMIN, old, NIGHT)).not.toThrow();
  });
});
