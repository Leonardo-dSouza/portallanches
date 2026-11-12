import { BadRequestException } from '@nestjs/common';
import type { DrawerToCountItem } from '../report/drawer-check.js';
import {
  assertValidDrawerCounts,
  parseDrawerCountInput,
  type KnownPaymentMethod,
} from './drawer-count-input.js';

describe('drawer-count-input', () => {
  describe('parseDrawerCountInput', () => {
    it('aceita contagem válida com ou sem observação', () => {
      const parsed = parseDrawerCountInput({
        counts: [
          { paymentMethodId: 1, amount: '50.00' },
          { paymentMethodId: 2, amount: '100' },
        ],
        note: '  Tudo certo  ',
      });
      expect(parsed).toEqual({
        counts: [
          { paymentMethodId: 1, amount: '50.00' },
          { paymentMethodId: 2, amount: '100.00' },
        ],
        note: 'Tudo certo',
      });
    });

    it('observação vazia ou em branco vira null', () => {
      expect(
        parseDrawerCountInput({ counts: [], note: '   ' }).note,
      ).toBeNull();
      expect(parseDrawerCountInput({ counts: [] }).note).toBeNull();
    });

    it('rejeita corpo não-objeto ou counts que não seja array', () => {
      expect(() => parseDrawerCountInput(null)).toThrow(BadRequestException);
      expect(() => parseDrawerCountInput({ counts: 'invalido' })).toThrow(
        BadRequestException,
      );
    });

    it('rejeita valor negativo ou mal formatado no amount', () => {
      expect(() =>
        parseDrawerCountInput({
          counts: [{ paymentMethodId: 1, amount: '-5.00' }],
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        parseDrawerCountInput({
          counts: [{ paymentMethodId: 1, amount: 'dez' }],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejeita id repetido na contagem', () => {
      expect(() =>
        parseDrawerCountInput({
          counts: [
            { paymentMethodId: 1, amount: '10.00' },
            { paymentMethodId: 1, amount: '20.00' },
          ],
        }),
      ).toThrow(/repetida/);
    });

    it('rejeita observação com caracteres de controle ou acima de 500 caracteres', () => {
      expect(() =>
        parseDrawerCountInput({
          counts: [],
          note: 'Texto\x00com controle',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        parseDrawerCountInput({
          counts: [],
          note: 'a'.repeat(501),
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertValidDrawerCounts', () => {
    const TO_COUNT: DrawerToCountItem[] = [
      { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
      { paymentMethodId: 2, name: 'PIX', isCash: false },
      { paymentMethodId: 3, name: 'Cartão Ton', isCash: false },
    ];

    const KNOWN: KnownPaymentMethod[] = [
      { id: 1, name: 'Dinheiro', isFiado: false },
      { id: 2, name: 'PIX', isFiado: false },
      { id: 3, name: 'Cartão Ton', isFiado: false },
      { id: 4, name: 'Fiado', isFiado: true },
      { id: 5, name: 'Cartão Inativo', isFiado: false },
    ];

    it('passa quando todas as formas de toCount estão presentes', () => {
      expect(() =>
        assertValidDrawerCounts(
          [
            { paymentMethodId: 1, amount: '50.00' },
            { paymentMethodId: 2, amount: '100.00' },
            { paymentMethodId: 3, amount: '25.00' },
          ],
          TO_COUNT,
          KNOWN,
        ),
      ).not.toThrow();
    });

    it('rejeita falta de formas de toCount listando os nomes na ordem', () => {
      expect(() =>
        assertValidDrawerCounts(
          [{ paymentMethodId: 1, amount: '50.00' }],
          TO_COUNT,
          KNOWN,
        ),
      ).toThrow(
        new BadRequestException('Falta a contagem de: PIX, Cartão Ton'),
      );
    });

    it('rejeita contagem de forma fiado', () => {
      expect(() =>
        assertValidDrawerCounts(
          [
            { paymentMethodId: 1, amount: '50.00' },
            { paymentMethodId: 2, amount: '100.00' },
            { paymentMethodId: 3, amount: '25.00' },
            { paymentMethodId: 4, amount: '10.00' },
          ],
          TO_COUNT,
          KNOWN,
        ),
      ).toThrow(/fiado não pode ser contada/);
    });

    it('rejeita forma inexistente', () => {
      expect(() =>
        assertValidDrawerCounts(
          [
            { paymentMethodId: 1, amount: '50.00' },
            { paymentMethodId: 2, amount: '100.00' },
            { paymentMethodId: 3, amount: '25.00' },
            { paymentMethodId: 99, amount: '10.00' },
          ],
          TO_COUNT,
          KNOWN,
        ),
      ).toThrow(/inexistente/);
    });

    it('rejeita forma fora de toCount', () => {
      expect(() =>
        assertValidDrawerCounts(
          [
            { paymentMethodId: 1, amount: '50.00' },
            { paymentMethodId: 2, amount: '100.00' },
            { paymentMethodId: 3, amount: '25.00' },
            { paymentMethodId: 5, amount: '10.00' },
          ],
          TO_COUNT,
          KNOWN,
        ),
      ).toThrow(/fora da conferência/);
    });
  });
});
