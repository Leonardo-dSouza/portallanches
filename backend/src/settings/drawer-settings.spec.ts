import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_DRAWER_CASH_TOLERANCE,
  DEFAULT_DRAWER_OPENING_DEFAULT,
  parseDrawerCashTolerance,
  parseDrawerOpeningDefault,
  readStoredDrawerCashTolerance,
  readStoredDrawerOpeningDefault,
} from './drawer-settings.js';

describe('drawer-settings', () => {
  describe('parseDrawerOpeningDefault', () => {
    it('normaliza valores válidos em número e texto', () => {
      expect(parseDrawerOpeningDefault(30)).toBe('30.00');
      expect(parseDrawerOpeningDefault('40.5')).toBe('40.50');
      expect(parseDrawerOpeningDefault('0')).toBe('0.00');
      expect(parseDrawerOpeningDefault('9999.99')).toBe('9999.99');
    });

    it('rejeita valor acima de 9999.99', () => {
      expect(() => parseDrawerOpeningDefault('10000.00')).toThrow(
        BadRequestException,
      );
    });

    it('rejeita negativo ou texto inválido', () => {
      expect(() => parseDrawerOpeningDefault('-1')).toThrow(
        BadRequestException,
      );
      expect(() => parseDrawerOpeningDefault('trinta')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseDrawerCashTolerance', () => {
    it('normaliza valores válidos', () => {
      expect(parseDrawerCashTolerance(2)).toBe('2.00');
      expect(parseDrawerCashTolerance('1.50')).toBe('1.50');
      expect(parseDrawerCashTolerance(0)).toBe('0.00');
    });

    it('rejeita valor acima de 9999.99', () => {
      expect(() => parseDrawerCashTolerance(10000)).toThrow(
        BadRequestException,
      );
    });

    it('rejeita valor negativo', () => {
      expect(() => parseDrawerCashTolerance(-2)).toThrow(BadRequestException);
    });
  });

  describe('readStored', () => {
    it('devolve padrão quando nulo', () => {
      expect(readStoredDrawerOpeningDefault(null)).toBe(
        DEFAULT_DRAWER_OPENING_DEFAULT,
      );
      expect(readStoredDrawerCashTolerance(null)).toBe(
        DEFAULT_DRAWER_CASH_TOLERANCE,
      );
    });

    it('devolve padrão quando estragado', () => {
      expect(readStoredDrawerOpeningDefault('invalido')).toBe(
        DEFAULT_DRAWER_OPENING_DEFAULT,
      );
      expect(readStoredDrawerCashTolerance('-5')).toBe(
        DEFAULT_DRAWER_CASH_TOLERANCE,
      );
    });

    it('devolve valor normalizado quando válido', () => {
      expect(readStoredDrawerOpeningDefault('45')).toBe('45.00');
      expect(readStoredDrawerCashTolerance('3.50')).toBe('3.50');
    });
  });
});
