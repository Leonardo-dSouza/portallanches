import type { DeliveryZone, StreetZoneCount } from '../api/types';
import { EMPTY_ORDER_FORM } from './order-form-values';
import { fillZoneFromStreet, inferZone } from './street-zone';

const zone = (
  id: number,
  neighborhood: string,
  active = true,
): DeliveryZone => ({
  id,
  neighborhood,
  neighborhoodKey: neighborhood.toLowerCase(),
  fee: '5.00',
  active,
});

const ZONES = [
  zone(1, 'Monterrey'),
  zone(2, 'Pousada do Vale'),
  zone(3, 'Centro'),
  zone(4, 'Antigo', false),
];

const COUNTS: StreetZoneCount[] = [
  { street: 'Rua Camomila', deliveryZoneId: 2, customers: 3 },
  { street: 'Rua Camomila', deliveryZoneId: 1, customers: 1 },
  { street: 'Rua Longa', deliveryZoneId: 3, customers: 2 },
  { street: 'Rua Longa', deliveryZoneId: 1, customers: 2 },
  { street: 'Rua Velha', deliveryZoneId: 4, customers: 5 },
];

describe('inferZone', () => {
  it('rua já cadastrada traz o bairro com mais clientes', () => {
    expect(inferZone('Rua Camomila', COUNTS, ZONES)?.neighborhood).toBe(
      'Pousada do Vale',
    );
  });

  it('acha a rua escrita de outro jeito (abreviação, caixa, acento)', () => {
    expect(inferZone(' r. CAMOMILA ', COUNTS, ZONES)?.id).toBe(2);
  });

  it('empate fica com o bairro de menor id', () => {
    expect(inferZone('Rua Longa', COUNTS, ZONES)?.id).toBe(1);
  });

  it('ignora bairro inativo e rua desconhecida', () => {
    expect(inferZone('Rua Velha', COUNTS, ZONES)).toBeNull();
    expect(inferZone('Rua Nova', COUNTS, ZONES)).toBeNull();
  });
});

describe('fillZoneFromStreet', () => {
  const delivery = { ...EMPTY_ORDER_FORM, type: 'DELIVERY' as const };

  it('com o Bairro vazio, preenche o bairro e a taxa dele', () => {
    const values = { ...delivery, street: 'Rua Camomila' };
    expect(fillZoneFromStreet(values, COUNTS, ZONES)).toMatchObject({
      neighborhood: 'Pousada do Vale',
      fee: '5,00',
    });
  });

  it('não troca o bairro que o caixa já digitou', () => {
    const values = {
      ...delivery,
      street: 'Rua Camomila',
      neighborhood: 'Centro',
    };
    expect(fillZoneFromStreet(values, COUNTS, ZONES).neighborhood).toBe(
      'Centro',
    );
  });
});
