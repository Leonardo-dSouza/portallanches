import { formatAddress, normalizeHouseNumber } from './address';

describe('normalizeHouseNumber', () => {
  it('apara e padroniza "sem número"', () => {
    expect(normalizeHouseNumber(' 123A ')).toBe('123A');
    expect(normalizeHouseNumber('s/n')).toBe('S/N');
    expect(normalizeHouseNumber(' S / N ')).toBe('S/N');
  });
});

describe('formatAddress', () => {
  it('rua com número; cliente antigo sem número fica só com a rua', () => {
    expect(formatAddress('Rua A', '123')).toBe('Rua A, 123');
    expect(formatAddress('Rua A', null)).toBe('Rua A');
  });
});
