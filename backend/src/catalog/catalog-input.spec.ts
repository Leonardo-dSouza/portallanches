import { BadRequestException } from '@nestjs/common';
import {
  parseDeliveryZoneInput,
  parseNewDeliveryZoneInput,
  parseMotoboyRateInput,
  parsePaymentMethodInput,
} from './catalog-input.js';

describe('catalog-input', () => {
  it('aceita forma de pagamento válida, comum ou maquininha', () => {
    const pix = {
      name: ' PIX ',
      active: true,
      sortOrder: 0,
      isCash: false,
      isFiado: false,
    };
    expect(parsePaymentMethodInput({ ...pix, isCardTerminal: false })).toEqual({
      name: 'PIX',
      active: true,
      sortOrder: 0,
      isCardTerminal: false,
      isCash: false,
      isFiado: false,
    });
    expect(
      parsePaymentMethodInput({ ...pix, name: 'Ton', isCardTerminal: true }),
    ).toMatchObject({ name: 'Ton', isCardTerminal: true });
  });

  it('rejeita forma de pagamento sem active, sem isCardTerminal ou sem isCash', () => {
    expect(() =>
      parsePaymentMethodInput({
        name: 'PIX',
        sortOrder: 0,
        isCardTerminal: false,
        isCash: false,
        isFiado: false,
      }),
    ).toThrow(/"active"/);
    expect(() =>
      parsePaymentMethodInput({
        name: 'PIX',
        active: true,
        sortOrder: 0,
        isCash: false,
        isFiado: false,
      }),
    ).toThrow(/"isCardTerminal"/);
    expect(() =>
      parsePaymentMethodInput({
        name: 'PIX',
        active: true,
        sortOrder: 0,
        isCardTerminal: false,
        isFiado: false,
      }),
    ).toThrow(/"isCash"/);
    expect(() =>
      parsePaymentMethodInput({
        name: 'PIX',
        active: true,
        sortOrder: 0,
        isCardTerminal: false,
        isCash: false,
      }),
    ).toThrow(/"isFiado"/);
  });

  it('dinheiro e maquininha ao mesmo tempo é recusado (2026-10-10)', () => {
    const base = {
      name: 'Dinheiro',
      active: true,
      sortOrder: 0,
      isFiado: false,
    };
    expect(
      parsePaymentMethodInput({ ...base, isCardTerminal: false, isCash: true }),
    ).toMatchObject({ isCash: true });
    expect(() =>
      parsePaymentMethodInput({ ...base, isCardTerminal: true, isCash: true }),
    ).toThrow(/"isCash" e "isCardTerminal"/);
  });

  it('fiado não entra na gaveta: não pode ser dinheiro nem maquininha (2026-10-25)', () => {
    const base = { name: 'Fiado', active: true, sortOrder: 5, isFiado: true };
    const plain = { ...base, isCash: false, isCardTerminal: false };
    expect(parsePaymentMethodInput(plain)).toMatchObject({ isFiado: true });
    expect(() => parsePaymentMethodInput({ ...plain, isCash: true })).toThrow(
      /"isFiado".*"isCash"/,
    );
    expect(() =>
      parsePaymentMethodInput({ ...plain, isCardTerminal: true }),
    ).toThrow(/"isFiado".*"isCardTerminal"/);
  });

  it('aceita bairro com taxa zero e normaliza a taxa', () => {
    const zone = { active: true, requiresDeliveryCode: false };
    expect(
      parseDeliveryZoneInput({ ...zone, neighborhood: 'Centro', fee: 5 }),
    ).toEqual({
      neighborhood: 'Centro',
      fee: '5.00',
      active: true,
      requiresDeliveryCode: false,
    });
    expect(
      parseDeliveryZoneInput({ ...zone, neighborhood: 'Perto', fee: 0 }).fee,
    ).toBe('0.00');
  });

  it('rejeita bairro com taxa negativa', () => {
    expect(() =>
      parseDeliveryZoneInput({
        neighborhood: 'X',
        fee: -1,
        active: true,
        requiresDeliveryCode: false,
      }),
    ).toThrow(BadRequestException);
  });

  it('o admin liga o código de entrega do bairro (2026-11-21)', () => {
    const zone = { neighborhood: 'Colinas 1', fee: 6, active: true };
    expect(
      parseDeliveryZoneInput({ ...zone, requiresDeliveryCode: true })
        .requiresDeliveryCode,
    ).toBe(true);
    expect(() => parseDeliveryZoneInput(zone)).toThrow(/requiresDeliveryCode/);
  });

  it('bairro novo do caixa nasce ativo, sem código, e ignora o que vier', () => {
    expect(
      parseNewDeliveryZoneInput({
        neighborhood: 'Dunamis',
        fee: 8,
        active: false,
        requiresDeliveryCode: true,
      }),
    ).toEqual({
      neighborhood: 'Dunamis',
      fee: '8.00',
      active: true,
      requiresDeliveryCode: false,
    });
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
