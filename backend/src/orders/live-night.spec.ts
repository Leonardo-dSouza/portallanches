import { isLiveNight } from './live-night.js';

const TZ = 'America/Sao_Paulo';
/** Instante em Brasília (UTC-3). */
const at = (local: string) => new Date(`${local}-03:00`);

describe('isLiveNight', () => {
  it('pedido do caixa de hoje baixa', () => {
    expect(isLiveNight('2026-10-09', at('2026-10-09T21:00:00'), TZ)).toBe(true);
  });

  it('caixa de ontem lançado de madrugada (antes das 6h) ainda baixa', () => {
    expect(isLiveNight('2026-10-09', at('2026-10-10T05:59:00'), TZ)).toBe(true);
  });

  it('caixa de ontem lançado a partir das 6h é atrasado: não baixa', () => {
    expect(isLiveNight('2026-10-09', at('2026-10-10T06:00:00'), TZ)).toBe(
      false,
    );
  });

  it('caixa de anteontem nunca baixa, nem de madrugada', () => {
    expect(isLiveNight('2026-10-05', at('2026-10-10T01:00:00'), TZ)).toBe(
      false,
    );
  });
});
