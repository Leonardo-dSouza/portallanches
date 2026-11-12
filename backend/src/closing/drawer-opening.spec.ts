import { BadRequestException, ConflictException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';
import {
  assertCanOpenDrawer,
  formatBrlCurrency,
  parseDrawerOpeningInput,
} from './drawer-opening.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

const BASE_CLOSING: ClosingRecord = {
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

describe('drawer-opening', () => {
  describe('parseDrawerOpeningInput', () => {
    it('aceita valores válidos em número ou texto', () => {
      expect(parseDrawerOpeningInput({ amount: '30.00' })).toBe('30.00');
      expect(parseDrawerOpeningInput({ amount: 40 })).toBe('40.00');
      expect(parseDrawerOpeningInput({ amount: 0 })).toBe('0.00');
      expect(parseDrawerOpeningInput({ amount: '12.5' })).toBe('12.50');
    });

    it('rejeita corpo não-objeto ou sem amount', () => {
      expect(() => parseDrawerOpeningInput(null)).toThrow(BadRequestException);
      expect(() => parseDrawerOpeningInput({})).toThrow(BadRequestException);
      expect(() => parseDrawerOpeningInput('30.00')).toThrow(
        BadRequestException,
      );
    });

    it('rejeita valor negativo ou mal formatado', () => {
      expect(() => parseDrawerOpeningInput({ amount: -10 })).toThrow(
        BadRequestException,
      );
      expect(() => parseDrawerOpeningInput({ amount: 'trinta' })).toThrow(
        BadRequestException,
      );
      expect(() => parseDrawerOpeningInput({ amount: '30,00' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('formatBrlCurrency', () => {
    it('formata no padrão R$ XX,XX', () => {
      expect(formatBrlCurrency('30.00')).toBe('R$ 30,00');
      expect(formatBrlCurrency('2.50')).toBe('R$ 2,50');
      expect(formatBrlCurrency('0.00')).toBe('R$ 0,00');
    });
  });

  describe('assertCanOpenDrawer', () => {
    it('caixa pode abrir se openingCash é nulo', () => {
      expect(() =>
        assertCanOpenDrawer(CAIXA, { ...BASE_CLOSING, openingCash: null }),
      ).not.toThrow();
    });

    it('caixa leva 409 se openingCash já informado', () => {
      expect(() =>
        assertCanOpenDrawer(CAIXA, { ...BASE_CLOSING, openingCash: '30.00' }),
      ).toThrow(
        new ConflictException(
          'Troco inicial já informado: R$ 30,00; corrigir é com o admin',
        ),
      );
    });

    it('admin pode corrigir troco inicial quantas vezes quiser', () => {
      expect(() =>
        assertCanOpenDrawer(ADMIN, { ...BASE_CLOSING, openingCash: '30.00' }),
      ).not.toThrow();
    });
  });
});
