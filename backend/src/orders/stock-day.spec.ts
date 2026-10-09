import { movesStock } from './stock-day.js';

const TZ = 'America/Sao_Paulo';
/** Instante em Brasília (UTC-3). */
const at = (local: string) => new Date(`${local}-03:00`);

describe('movesStock', () => {
  it('pedido do caixa de hoje baixa', () => {
    expect(movesStock('2026-10-09', at('2026-10-09T21:00:00'), TZ)).toBe(true);
  });

  it('caixa de ontem lançado de madrugada (antes das 6h) ainda baixa', () => {
    expect(movesStock('2026-10-09', at('2026-10-10T05:59:00'), TZ)).toBe(true);
  });

  it('caixa de ontem lançado a partir das 6h é atrasado: não baixa', () => {
    expect(movesStock('2026-10-09', at('2026-10-10T06:00:00'), TZ)).toBe(false);
  });

  it('caixa de anteontem nunca baixa, nem de madrugada', () => {
    expect(movesStock('2026-10-05', at('2026-10-10T01:00:00'), TZ)).toBe(false);
  });
});
