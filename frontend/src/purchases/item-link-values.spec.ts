import { initialChoice, linkChoices, linkPreview } from './item-link-values';

describe('linkPreview', () => {
  it('divide o preço da nota pela embalagem e compara com a base (a conta do backend)', () => {
    expect(linkPreview('45.79', '36', '1.2444')).toEqual({
      paidPerUnit: '1.2719',
      basePerUnit: '1.2444',
      diffPercent: '2.2',
      above: true,
    });
  });

  it('abaixo da base dá diferença negativa', () => {
    expect(linkPreview('42.90', '36', '1.2444')).toMatchObject({
      paidPerUnit: '1.1917',
      diffPercent: '-4.2',
      above: false,
    });
  });

  it('sem preço base, mostra só o pago', () => {
    expect(linkPreview('3.99', '1', null)).toEqual({
      paidPerUnit: '3.9900',
      basePerUnit: null,
      diffPercent: null,
      above: false,
    });
  });

  it('embalagem sem quantidade não tem conta', () => {
    expect(linkPreview('3.99', '0', '1')).toBeNull();
  });
});

const BURGER = { id: 10, packages: [{ name: 'caixa', quantity: '36' }] };

describe('linkChoices', () => {
  it('as embalagens do insumo e a unidade', () => {
    expect(linkChoices(BURGER, null)).toEqual([
      { label: 'caixa', quantity: '36' },
      { label: null, quantity: '1' },
    ]);
  });

  it('mantém a embalagem gravada que o insumo não tem mais', () => {
    expect(linkChoices(BURGER, { label: 'fardo', quantity: '56' })).toEqual([
      { label: 'caixa', quantity: '36' },
      { label: null, quantity: '1' },
      { label: 'fardo', quantity: '56' },
    ]);
  });

  it('não repete a gravada quando ela já está na lista', () => {
    expect(
      linkChoices(BURGER, { label: 'caixa', quantity: '36.000' }),
    ).toHaveLength(2);
  });
});

describe('initialChoice', () => {
  const link = {
    supplyId: 10,
    supplyName: 'Hambúrguer',
    baseQuantity: '56',
    label: 'fardo',
  };

  it('a da ligação gravada, no mesmo insumo', () => {
    expect(initialChoice(link, BURGER)).toEqual({
      label: 'fardo',
      quantity: '56',
    });
  });

  it('a primeira do insumo, quando troca de insumo', () => {
    expect(initialChoice(link, { ...BURGER, id: 11 })).toEqual({
      label: 'caixa',
      quantity: '36',
    });
  });
});
