import {
  cursorOf,
  dayLabel,
  formatShortDate,
  monthGrid,
  monthTitle,
  moveFocus,
  shiftMonth,
} from './calendar-math';

describe('monthGrid', () => {
  it('semanas de domingo a sábado, com os dias vizinhos completando a grade', () => {
    const october = monthGrid({ year: 2026, month: 9 });
    expect(october).toHaveLength(5);
    expect(october[0][0]).toBe('2026-09-27');
    expect(october[0][4]).toBe('2026-10-01');
    expect(october.at(-1)?.at(-1)).toBe('2026-10-31');
  });

  it('fevereiro que começa no domingo cabe em 4 semanas', () => {
    const february = monthGrid({ year: 2026, month: 1 });
    expect(february).toHaveLength(4);
    expect(february[0][0]).toBe('2026-02-01');
  });
});

describe('meses e rótulos', () => {
  it('cursor, troca de mês na virada do ano e título por extenso', () => {
    expect(cursorOf('2026-10-07')).toEqual({ year: 2026, month: 9 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
    expect(monthTitle({ year: 2026, month: 9 })).toBe('outubro de 2026');
  });

  it('data curta no botão e por extenso para o leitor de tela', () => {
    expect(formatShortDate('2026-10-07')).toBe('qua, 07/10/2026');
    expect(dayLabel('2026-10-07')).toBe('quarta, 7 de outubro de 2026');
  });
});

describe('moveFocus', () => {
  it('setas andam um dia ou uma semana', () => {
    expect(moveFocus('2026-10-31', 'ArrowRight')).toBe('2026-11-01');
    expect(moveFocus('2026-10-01', 'ArrowLeft')).toBe('2026-09-30');
    expect(moveFocus('2026-10-07', 'ArrowDown')).toBe('2026-10-14');
    expect(moveFocus('2026-10-07', 'ArrowUp')).toBe('2026-09-30');
  });

  it('PageUp/PageDown trocam o mês sem passar do último dia; Home/End vão ao domingo e ao sábado', () => {
    expect(moveFocus('2026-01-31', 'PageDown')).toBe('2026-02-28');
    expect(moveFocus('2026-03-31', 'PageUp')).toBe('2026-02-28');
    expect(moveFocus('2026-10-07', 'Home')).toBe('2026-10-04');
    expect(moveFocus('2026-10-07', 'End')).toBe('2026-10-10');
  });

  it('outra tecla não move', () => {
    expect(moveFocus('2026-10-07', 'a')).toBeNull();
  });
});
