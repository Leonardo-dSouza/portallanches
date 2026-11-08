import { choiceKeyRows, moveOption } from './choice-keys';

const OPTIONS = [
  { id: 66, name: 'Pão Gergelim', sortOrder: 1, active: true },
  { id: 67, name: 'Pão Brioche', sortOrder: 2, active: true },
  { id: 68, name: 'Pão Australiano', sortOrder: 3, active: false },
  { id: 65, name: 'Pão Tradicional', sortOrder: 4, active: true },
];

describe('choiceKeyRows', () => {
  it('numera só as ativas, na ordem gravada, como o caixa', () => {
    expect(choiceKeyRows(OPTIONS).map((row) => row.key)).toEqual([
      1,
      2,
      null,
      3,
    ]);
  });
});

describe('moveOption', () => {
  it('troca com o vizinho e manda a lista inteira; null na ponta', () => {
    expect(moveOption(OPTIONS, 67, -1)).toEqual([67, 66, 68, 65]);
    expect(moveOption(OPTIONS, 66, -1)).toBeNull();
    expect(moveOption(OPTIONS, 65, 1)).toBeNull();
  });
});
