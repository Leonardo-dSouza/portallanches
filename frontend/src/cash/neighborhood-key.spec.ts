import { toNeighborhoodKey } from './neighborhood-key';

describe('toNeighborhoodKey', () => {
  it('ignora acento, caixa e espaços repetidos', () => {
    expect(toNeighborhoodKey('  São   José ')).toBe('sao jose');
    expect(toNeighborhoodKey('DUNAMIS')).toBe('dunamis');
  });
});
