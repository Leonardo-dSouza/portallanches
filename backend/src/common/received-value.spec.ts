import { describeReceived } from './received-value.js';

describe('describeReceived', () => {
  it('valor curto volta como JSON', () => {
    expect(describeReceived('abc')).toBe('"abc"');
    expect(describeReceived(12)).toBe('12');
    expect(describeReceived({ a: [1] })).toBe('{"a":[1]}');
    expect(describeReceived(undefined)).toBe('undefined');
  });

  it('valor de 1 MB volta cortado, com o tamanho', () => {
    const echoed = describeReceived('x'.repeat(1_000_000));
    expect(echoed.length).toBeLessThan(260);
    expect(echoed).toMatch(/… \(1000002 caracteres\)$/);
  });
});
