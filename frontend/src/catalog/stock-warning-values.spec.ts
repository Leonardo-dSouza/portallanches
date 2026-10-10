import { parseStockWarning } from './stock-warning-values';

describe('parseStockWarning', () => {
  it('aceita inteiro de 0 a 999 (0 = nunca mostrar)', () => {
    expect(parseStockWarning(' 6 ')).toEqual({ ok: true, value: 6 });
    expect(parseStockWarning('0')).toEqual({ ok: true, value: 0 });
  });

  it('recusa vazio, fração e texto citando o valor', () => {
    expect(parseStockWarning('')).toMatchObject({ ok: false });
    expect(parseStockWarning('2,5')).toEqual({
      ok: false,
      error:
        'Aviso de saldo inválido "2,5": esperado número inteiro de 0 a 999 (0 = nunca mostrar)',
    });
  });
});
