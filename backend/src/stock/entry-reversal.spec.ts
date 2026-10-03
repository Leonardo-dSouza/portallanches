import { UnprocessableEntityException } from '@nestjs/common';
import { assertReversible, type ReversalCandidate } from './entry-reversal.js';

const lot = (overrides: Partial<ReversalCandidate>): ReversalCandidate => ({
  lotId: 4,
  supplyName: 'Coca Cola 2l',
  quantity: '12',
  remaining: '12',
  reversedAt: null,
  laterMovements: 0,
  isEntry: true,
  ...overrides,
});

describe('assertReversible', () => {
  it('entrada intacta pode ser desfeita', () => {
    expect(() => assertReversible(lot({}))).not.toThrow();
  });

  it.each([
    ['já desfeita', { reversedAt: new Date() }, 'já foi desfeita'],
    ['contada depois', { remaining: '8', laterMovements: 1 }, '(8 de 12)'],
    [
      'movimento sem mudar saldo',
      { laterMovements: 2 },
      'corrija pela contagem',
    ],
    ['sobra de contagem', { isEntry: false }, 'sobra de contagem'],
  ])('%s: recusa com o motivo', (_label, overrides, reason) => {
    expect(() => assertReversible(lot(overrides))).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertReversible(lot(overrides))).toThrow(reason);
  });
});
