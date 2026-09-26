import { BadRequestException } from '@nestjs/common';
import { parseSupplyInput } from './supply-input.js';

const BURGER = {
  name: ' Hambúrguer 56g ',
  countUnit: 'un',
  minStock: 40,
  packages: [{ name: 'caixa', quantity: 36 }],
};

describe('parseSupplyInput', () => {
  it('apara textos, normaliza quantidades e nasce ativo', () => {
    expect(parseSupplyInput(BURGER)).toEqual({
      name: 'Hambúrguer 56g',
      countUnit: 'un',
      minStock: '40',
      unitCost: null,
      deductOnSale: true,
      active: true,
      packages: [{ name: 'caixa', quantity: '36' }],
    });
  });

  it('sem mínimo e sem embalagens é válido (ex.: calabresa fatiada)', () => {
    const input = parseSupplyInput({ name: 'Calabresa', countUnit: 'kg' });
    expect(input).toMatchObject({ minStock: null, packages: [] });
  });

  it('aceita quantidade fracionada e respeita active=false', () => {
    const input = parseSupplyInput({
      ...BURGER,
      minStock: '2.5',
      active: false,
    });
    expect(input).toMatchObject({ minStock: '2.5', active: false });
  });

  it('lê custo por unidade e baixa automática desligada (ex.: tomate)', () => {
    const input = parseSupplyInput({
      ...BURGER,
      unitCost: '39.90',
      deductOnSale: false,
    });
    expect(input).toMatchObject({ unitCost: '39.9', deductOnSale: false });
  });

  it('rejeita embalagem repetida ignorando maiúsculas', () => {
    expect(() =>
      parseSupplyInput({
        ...BURGER,
        packages: [
          { name: 'Caixa', quantity: 36 },
          { name: 'caixa', quantity: 12 },
        ],
      }),
    ).toThrow(/Embalagem repetida: "caixa"/);
  });

  it.each([
    [{ packages: [{ name: 'fardo', quantity: 0 }] }, /packages\[0\]\.quantity/],
    [{ packages: 'caixa' }, /"packages"/],
    [{ countUnit: '' }, /"countUnit"/],
    [{ minStock: -1 }, /"minStock"/],
    [{ unitCost: '39,90' }, /"unitCost"/],
    [{ deductOnSale: 'sim' }, /"deductOnSale"/],
  ])('rejeita %j', (override, message) => {
    expect(() => parseSupplyInput({ ...BURGER, ...override })).toThrow(message);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => parseSupplyInput('x')).toThrow(BadRequestException);
  });
});
