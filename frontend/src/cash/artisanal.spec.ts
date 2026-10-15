import { describe, expect, it } from 'vitest';
import { isArtisanal } from './artisanal';

describe('isArtisanal', () => {
  it('só a categoria Artesanal', () => {
    expect(isArtisanal('Artesanal')).toBe(true);
    expect(isArtisanal('Tradicional')).toBe(false);
    expect(isArtisanal('Refrigerantes')).toBe(false);
  });
});
