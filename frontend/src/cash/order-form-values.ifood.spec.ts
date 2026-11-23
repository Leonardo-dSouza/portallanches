import { describe, expect, it } from 'vitest';
import { build, form, ZONES } from '../test-support/order-form-fixtures';
import { withOrderField } from './order-form-values';

describe('formulário do pedido iFood (2026-11-23)', () => {
  it('escolher iFood apaga o pagamento; sair dele apaga o nº do app', () => {
    const ifood = withOrderField(
      form({ paymentMethodId: '2', changeFor: '50' }),
      'type',
      'IFOOD',
      ZONES,
    );
    expect([ifood.paymentMethodId, ifood.changeFor]).toEqual(['', '']);
    const counter = withOrderField(
      { ...ifood, ifoodCode: '4821' },
      'type',
      'COUNTER',
      ZONES,
    );
    expect(counter.ifoodCode).toBe('');
  });

  it('o corpo vai sem forma de pagamento, com o nome e o nº do app', () => {
    const result = build(
      form({
        type: 'IFOOD',
        paymentMethodId: '',
        counterName: ' Mariana ',
        ifoodCode: '4821',
      }),
      ZONES,
      null,
    );
    expect(result).toEqual({
      ok: true,
      request: {
        newZone: null,
        zoneId: null,
        customer: null,
        input: {
          items: [expect.objectContaining({ productId: 1, quantity: 2 })],
          type: 'IFOOD',
          counterName: 'Mariana',
          ifoodCode: '4821',
        },
      },
    });
  });

  it('sem nome e sem nº, vão só os itens', () => {
    const result = build(
      form({ type: 'IFOOD', paymentMethodId: '' }),
      ZONES,
      null,
    );
    expect(result.ok && Object.keys(result.request.input)).toEqual([
      'items',
      'type',
    ]);
  });
});
