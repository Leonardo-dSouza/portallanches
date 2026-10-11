import { BadRequestException } from '@nestjs/common';
import {
  parseArtisanalMark,
  parseTicketAbbreviations,
  readStoredAbbreviations,
} from './ticket-settings.js';

describe('parseArtisanalMark', () => {
  it('apara o texto da marca', () => {
    expect(parseArtisanalMark('  Art ')).toBe('Art');
  });

  it('recusa vazio e mais de 12 caracteres citando o valor', () => {
    expect(() => parseArtisanalMark('  ')).toThrow(BadRequestException);
    expect(() => parseArtisanalMark('Artesanal da casa')).toThrow(
      /"Artesanal da casa".*1 a 12/,
    );
  });
});

describe('parseTicketAbbreviations', () => {
  it('apara os textos; abreviação vazia apaga a palavra', () => {
    expect(
      parseTicketAbbreviations([
        { from: ' Leite condensado ', to: ' LC ' },
        { from: 'X', to: '' },
      ]),
    ).toEqual([
      { from: 'Leite condensado', to: 'LC' },
      { from: 'X', to: '' },
    ]);
  });

  it('lista vazia é válida (nenhuma abreviação)', () => {
    expect(parseTicketAbbreviations([])).toEqual([]);
  });

  it('recusa o que não é lista', () => {
    expect(() => parseTicketAbbreviations({ from: 'X', to: '' })).toThrow(
      /esperado lista/,
    );
  });

  it('recusa texto vazio, longo demais ou abreviação que não é texto, citando a posição', () => {
    expect(() => parseTicketAbbreviations([{ from: ' ', to: 'A' }])).toThrow(
      /ticketAbbreviations\[0\]\.from/,
    );
    expect(() =>
      parseTicketAbbreviations([{ from: 'Leite', to: 'L'.repeat(21) }]),
    ).toThrow(/ticketAbbreviations\[0\]\.to.*0 a 20/);
    expect(() => parseTicketAbbreviations([{ from: 'Leite', to: 3 }])).toThrow(
      /recebido 3/,
    );
  });

  it('recusa o mesmo texto duas vezes, sem ligar para maiúscula', () => {
    expect(() =>
      parseTicketAbbreviations([
        { from: 'Leite', to: 'L' },
        { from: 'LEITE', to: 'Lt' },
      ]),
    ).toThrow(/"LEITE".*uma vez só/);
  });

  it('recusa mais de 100 abreviações', () => {
    const many = Array.from({ length: 101 }, (_, index) => ({
      from: `Item ${index}`,
      to: `I${index}`,
    }));
    expect(() => parseTicketAbbreviations(many)).toThrow(/até 100/);
  });
});

describe('readStoredAbbreviations', () => {
  it('sem valor gravado ou com JSON estragado, nenhuma abreviação', () => {
    expect(readStoredAbbreviations(null)).toEqual([]);
    expect(readStoredAbbreviations('{quebrado')).toEqual([]);
    expect(readStoredAbbreviations('[{"from":""}]')).toEqual([]);
  });

  it('lê a lista gravada', () => {
    expect(
      readStoredAbbreviations('[{"from":"Leite em pó","to":"LP"}]'),
    ).toEqual([{ from: 'Leite em pó', to: 'LP' }]);
  });
});
