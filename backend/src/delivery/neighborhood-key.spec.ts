import { toNeighborhoodKey } from './neighborhood-key.js';

describe('toNeighborhoodKey', () => {
  it('remove acentos e converte para minúsculas', () => {
    expect(toNeighborhoodKey('São José')).toBe('sao jose');
  });

  it('ignora espaços nas pontas e repetidos', () => {
    expect(toNeighborhoodKey('  Monterrey   Norte ')).toBe('monterrey norte');
  });
});
