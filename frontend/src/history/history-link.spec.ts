import {
  historyLink,
  parseWeekdayParam,
  weekdayLinkLabel,
  weekdayTotalLabel,
} from './history-link';

describe('parseWeekdayParam', () => {
  it('0 a 6 viram número; ausente ou inválido = todos os dias', () => {
    expect(parseWeekdayParam('4')).toBe(4);
    expect(parseWeekdayParam('0')).toBe(0);
    expect(parseWeekdayParam(null)).toBeNull();
    expect(parseWeekdayParam('9')).toBeNull();
    expect(parseWeekdayParam('qui')).toBeNull();
  });
});

describe('historyLink', () => {
  it('período e, se houver, o dia da semana', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };
    expect(historyLink(range, 4)).toBe(
      '/historico?de=2026-09-01&ate=2026-09-30&dia=4',
    );
    expect(historyLink(range, null)).toBe(
      '/historico?de=2026-09-01&ate=2026-09-30',
    );
  });
});

describe('rótulos do dia da semana no plural', () => {
  it('concordam com o dia (das quintas, dos sábados)', () => {
    expect(weekdayTotalLabel(4)).toBe('Total das quintas');
    expect(weekdayTotalLabel(6)).toBe('Total dos sábados');
    expect(weekdayLinkLabel(5)).toBe('Ver as sextas no Histórico');
    expect(weekdayLinkLabel(0)).toBe('Ver os domingos no Histórico');
  });
});
