import { parseComponentFormula } from './formula-terms.js';

describe('parseComponentFormula', () => {
  it.each([
    ['itens_custos!F4', [{ cell: 'F4', factor: '1' }]],
    ['=itens_custos!F11*2', [{ cell: 'F11', factor: '2' }]],
    ['2*itens_custos!$F$11', [{ cell: 'F11', factor: '2' }]],
    [
      'itens_custos!F25+itens_custos!H44 + itens_custos!N21*0.5',
      [
        { cell: 'F25', factor: '1' },
        { cell: 'H44', factor: '1' },
        { cell: 'N21', factor: '0.5' },
      ],
    ],
  ])('%s', (formula, terms) => {
    expect(parseComponentFormula(formula)).toEqual(terms);
  });

  it.each([
    'SUM(D2:AF2)',
    'itens_custos!F4-1',
    'Lanches!F4',
    'itens_custos!F4*0.0001',
    '',
  ])('recusa %j', (formula) => {
    expect(parseComponentFormula(formula)).toBeNull();
  });
});
