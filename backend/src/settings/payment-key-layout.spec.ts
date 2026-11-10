import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_PAYMENT_KEY_LAYOUT,
  parsePaymentKeyLayout,
  readStoredPaymentKeyLayout,
} from './payment-key-layout.js';

describe('parsePaymentKeyLayout', () => {
  it('aceita a posição de cada tecla especial e se ela aparece', () => {
    const layout = {
      openAccount: { position: 3, active: false },
      split: { position: 2, active: true },
    };
    expect(parsePaymentKeyLayout(layout)).toEqual(layout);
  });

  it('recusa posição fora de 0 a 99, com o valor recebido', () => {
    expect(() =>
      parsePaymentKeyLayout({
        openAccount: { position: -1, active: true },
        split: { position: 2, active: true },
      }),
    ).toThrow(/openAccount\.position.*-1/);
  });

  it('recusa as duas na mesma posição (a tecla ficaria sem número)', () => {
    expect(() =>
      parsePaymentKeyLayout({
        openAccount: { position: 2, active: true },
        split: { position: 2, active: true },
      }),
    ).toThrow(BadRequestException);
  });

  it('recusa active que não é booleano', () => {
    expect(() =>
      parsePaymentKeyLayout({
        openAccount: { position: 1, active: 'sim' },
        split: { position: 2, active: true },
      }),
    ).toThrow(/openAccount\.active/);
  });
});

describe('readStoredPaymentKeyLayout', () => {
  it('sem valor ou estragado: as duas no fim, ativas (como era antes)', () => {
    expect(readStoredPaymentKeyLayout(null)).toEqual(
      DEFAULT_PAYMENT_KEY_LAYOUT,
    );
    expect(readStoredPaymentKeyLayout('{x')).toEqual(
      DEFAULT_PAYMENT_KEY_LAYOUT,
    );
    expect(DEFAULT_PAYMENT_KEY_LAYOUT).toEqual({
      openAccount: { position: 98, active: true },
      split: { position: 99, active: true },
    });
  });

  it('lê o que foi gravado', () => {
    const layout = {
      openAccount: { position: 5, active: true },
      split: { position: 1, active: false },
    };
    expect(readStoredPaymentKeyLayout(JSON.stringify(layout))).toEqual(layout);
  });
});
