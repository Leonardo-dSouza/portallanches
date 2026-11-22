import { describe, expect, it } from 'vitest';
import {
  CRYPTO_DELIVERY_CODES,
  deliveryCodeFor,
  isGuessableCode,
  randomDeliveryCode,
} from './delivery-code.js';
import { FixedDeliveryCodes } from './order-fakes.fixture.js';

describe('isGuessableCode', () => {
  it.each(['1111', '9999', '1234', '6789', '4321', '9876'])(
    'recusa %s (iguais ou em sequência)',
    (code) => expect(isGuessableCode(code)).toBe(true),
  );

  it.each(['4827', '1235', '1122', '2468', '1001', '9012'])(
    'aceita %s',
    (code) => expect(isGuessableCode(code)).toBe(false),
  );
});

describe('randomDeliveryCode', () => {
  it('pede de 1000 a 9999 e pula o código fácil de chutar', () => {
    const draws = [1234, 7777, 4827];
    const ranges: number[][] = [];
    const code = randomDeliveryCode((min, max) => {
      ranges.push([min, max]);
      return draws.shift()!;
    });
    expect(code).toBe('4827');
    expect(ranges).toEqual([
      [1000, 10000],
      [1000, 10000],
      [1000, 10000],
    ]);
  });

  it('desiste com o último código na mensagem quando só sai código fácil', () => {
    expect(() => randomDeliveryCode(() => 1111)).toThrow(/a última "1111"/);
  });

  it('o sorteio de verdade dá 4 dígitos fora dos fáceis', () => {
    for (let round = 0; round < 50; round++) {
      const code = CRYPTO_DELIVERY_CODES.next();
      expect(code).toMatch(/^[1-9][0-9]{3}$/);
      expect(isGuessableCode(code)).toBe(false);
    }
  });
});

describe('deliveryCodeFor', () => {
  it('pedido com código sorteia quando ainda não tem', () => {
    const codes = new FixedDeliveryCodes(['4827']);
    expect(deliveryCodeFor(true, null, codes)).toBe('4827');
  });

  it('pedido com código mantém o que já tem, sem sortear', () => {
    const codes = new FixedDeliveryCodes([]);
    expect(deliveryCodeFor(true, '5913', codes)).toBe('5913');
  });

  it('pedido sem código apaga o que tinha', () => {
    const codes = new FixedDeliveryCodes([]);
    expect(deliveryCodeFor(false, '5913', codes)).toBeNull();
  });
});
