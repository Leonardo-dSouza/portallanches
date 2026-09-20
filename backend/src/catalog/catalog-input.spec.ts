import { BadRequestException } from '@nestjs/common';
import {
  parseDeliveryZoneInput,
  parseNewDeliveryZoneInput,
  parseMotoboyRateInput,
  parsePaymentMethodInput,
} from './catalog-input.js';

describe('catalog-input', () => {
  it('aceita forma de pagamento válida', () => {
    expect(
      parsePaymentMethodInput({ name: ' PIX ', active: true, sortOrder: 0 }),
    ).toEqual({
      name: 'PIX',
      active: true,
      sortOrder: 0,
    });
  });

  it('rejeita forma de pagamento sem active', () => {
    expect(() =>
      parsePaymentMethodInput({ name: 'PIX', sortOrder: 0 }),
    ).toThrow(/"active"/);
  });

  it('aceita bairro com taxa zero e normaliza a taxa', () => {
    expect(
      parseDeliveryZoneInput({ neighborhood: 'Centro', fee: 5, active: true }),
    ).toEqual({
      neighborhood: 'Centro',
      fee: '5.00',
      active: true,
    });
    expect(
      parseDeliveryZoneInput({ neighborhood: 'Perto', fee: 0, active: true })
        .fee,
    ).toBe('0.00');
  });

  it('rejeita bairro com taxa negativa', () => {
    expect(() =>
      parseDeliveryZoneInput({ neighborhood: 'X', fee: -1, active: true }),
    ).toThrow(BadRequestException);
  });

  it('bairro novo do caixa nasce ativo e ignora "active" enviado', () => {
    expect(
      parseNewDeliveryZoneInput({
        neighborhood: 'Dunamis',
        fee: 8,
        active: false,
      }),
    ).toEqual({ neighborhood: 'Dunamis', fee: '8.00', active: true });
  });

  it('bairro novo sem taxa é rejeitado', () => {
    expect(() => parseNewDeliveryZoneInput({ neighborhood: 'X' })).toThrow(
      BadRequestException,
    );
  });

  it('aceita diária válida', () => {
    expect(
      parseMotoboyRateInput({
        dayGroup: 'FRI_SUN',
        amount: '60',
        effectiveFrom: '2026-10-01',
      }),
    ).toEqual({
      dayGroup: 'FRI_SUN',
      amount: '60.00',
      effectiveFrom: '2026-10-01',
    });
  });

  it.each([
    { dayGroup: 'MON', amount: 10, effectiveFrom: '2026-10-01' },
    { dayGroup: 'FRI_SUN', amount: 0, effectiveFrom: '2026-10-01' },
    { dayGroup: 'FRI_SUN', amount: 10, effectiveFrom: '01/10/2026' },
    { dayGroup: 'FRI_SUN', amount: 10 },
  ])('rejeita diária inválida %j', (body) => {
    expect(() => parseMotoboyRateInput(body)).toThrow(BadRequestException);
  });
});
