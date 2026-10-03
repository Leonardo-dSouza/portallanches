import { packageWrites } from './package-writes.js';

describe('packageWrites', () => {
  it('troca só as embalagens da planilha (regressão: galão criado na tela sumia)', () => {
    const bisnaga = { name: 'bisnaga', quantity: '3.02' };
    expect(packageWrites([bisnaga])).toEqual({
      deleteMany: { name: { in: ['bisnaga'] } },
      create: [bisnaga],
    });
  });

  it('sem embalagem na planilha não apaga nenhuma', () => {
    expect(packageWrites([])).toEqual({
      deleteMany: { name: { in: [] } },
      create: [],
    });
  });
});
