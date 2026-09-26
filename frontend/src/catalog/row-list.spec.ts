import { replaceRowField, withoutRow } from './row-list';

describe('replaceRowField e withoutRow', () => {
  const rows = [
    { name: 'caixa', quantity: '36' },
    { name: 'fardo', quantity: '6' },
  ];

  it('troca só o campo da linha pedida, sem mutar a lista', () => {
    expect(replaceRowField(rows, 1, 'quantity', '12')).toEqual([
      { name: 'caixa', quantity: '36' },
      { name: 'fardo', quantity: '12' },
    ]);
    expect(rows[1].quantity).toBe('6');
  });

  it('remove a linha pedida', () => {
    expect(withoutRow(rows, 0)).toEqual([{ name: 'fardo', quantity: '6' }]);
  });
});
