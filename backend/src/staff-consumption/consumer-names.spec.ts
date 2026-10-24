import { uniqueRecentNames } from './consumer-names.js';

const row = (consumerName: string, consumerKey: string) => ({
  consumerName,
  consumerKey,
});

describe('uniqueRecentNames', () => {
  it('um nome por pessoa, com a grafia mais recente, na ordem recebida', () => {
    const rows = [
      row('Bianca', 'bianca'),
      row('Motoboy', 'motoboy'),
      row('bianca', 'bianca'),
      row('Léo', 'leo'),
    ];

    expect(uniqueRecentNames(rows, 20)).toEqual(['Bianca', 'Motoboy', 'Léo']);
  });

  it('para no limite', () => {
    const rows = [row('A', 'a'), row('B', 'b'), row('C', 'c')];

    expect(uniqueRecentNames(rows, 2)).toEqual(['A', 'B']);
  });
});
