import {
  BLANK_COUNT_ROW,
  buildCountItems,
  withMark,
  withTypedQuantity,
  type CountRowValues,
} from './count-form-values';

const nameOf = (id: number) => `Insumo ${id}`;

describe('linhas da contagem', () => {
  it('digitar marca como contado; apagar volta a em branco', () => {
    expect(withTypedQuantity('8')).toEqual({
      status: 'COUNTED',
      quantity: '8',
    });
    expect(withTypedQuantity(' ')).toEqual({ status: null, quantity: ' ' });
  });

  it('marca limpa o número; clicar de novo desmarca', () => {
    const marked = withMark(
      { status: 'COUNTED', quantity: '8' },
      'NEEDS_PURCHASE',
    );
    expect(marked).toEqual({ status: 'NEEDS_PURCHASE', quantity: '' });
    expect(withMark(marked, 'NEEDS_PURCHASE')).toEqual(BLANK_COUNT_ROW);
  });
});

describe('buildCountItems', () => {
  it('só as linhas preenchidas, com quantidade no formato da API', () => {
    const rows = new Map<number, CountRowValues>([
      [1, { status: 'COUNTED', quantity: '2,5' }],
      [2, BLANK_COUNT_ROW],
      [3, { status: 'NOT_COUNTED', quantity: '' }],
      [4, { status: 'NEEDS_PURCHASE', quantity: '' }],
      [5, { status: 'COUNTED', quantity: '0' }],
    ]);
    expect(buildCountItems(rows, nameOf)).toEqual({
      ok: true,
      value: [
        { supplyId: 1, status: 'COUNTED', quantity: '2.5' },
        { supplyId: 3, status: 'NOT_COUNTED' },
        { supplyId: 4, status: 'NEEDS_PURCHASE' },
        { supplyId: 5, status: 'COUNTED', quantity: '0' },
      ],
    });
  });

  it('nada preenchido ou número inválido dá erro com o nome do insumo', () => {
    expect(
      buildCountItems(new Map([[1, BLANK_COUNT_ROW]]), nameOf),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/pelo menos um/),
    });
    expect(
      buildCountItems(
        new Map([[7, { status: 'COUNTED', quantity: 'oito' }]]),
        nameOf,
      ),
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/"Insumo 7" inválida "oito"/),
    });
  });
});
