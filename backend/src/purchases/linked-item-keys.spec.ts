import { describe, expect, it } from 'vitest';
import { linkedItemKeys } from './linked-item-keys.js';

describe('linkedItemKeys', () => {
  it('linkedItemKeys tira repetidos e mantém a ordem da 1ª aparição', () => {
    const keys = linkedItemKeys([
      { vendorId: 1, code: '100' },
      { vendorId: 2, code: '100' },
      { vendorId: 1, code: '200' },
    ]);
    expect(keys).toEqual({ codes: ['100', '200'], vendorIds: [1, 2] });
  });

  it('sem ligação devolve listas vazias', () => {
    expect(linkedItemKeys([])).toEqual({ codes: [], vendorIds: [] });
  });
});
