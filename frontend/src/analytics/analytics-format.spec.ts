import {
  barShare,
  countLabel,
  describeChange,
  describeComparison,
  describeRange,
  formatDecimal,
  weekdayName,
} from './analytics-format';

describe('describeChange', () => {
  it('sinal vira direção, com vírgula decimal; sem base vira null', () => {
    expect(describeChange('12.5')).toEqual({ text: '12,5%', direction: 'up' });
    expect(describeChange('-3.0')).toEqual({ text: '3,0%', direction: 'down' });
    expect(describeChange('0.0')).toEqual({ text: '0,0%', direction: 'flat' });
    expect(describeChange(null)).toBeNull();
  });
});

describe('barShare', () => {
  it('largura proporcional ao maior valor; sem maior vira zero', () => {
    expect(barShare(25, 100)).toBe('25%');
    expect(barShare(3, 3)).toBe('100%');
    expect(barShare(0, 0)).toBe('0%');
  });
});

describe('formatos', () => {
  it('decimal com vírgula, nome do dia e período legível', () => {
    expect(formatDecimal('8.8')).toBe('8,8');
    expect(countLabel(1, 'entrega', 'entregas')).toBe('1 entrega');
    expect(countLabel(3, 'entrega', 'entregas')).toBe('3 entregas');
    expect(weekdayName(2)).toBe('Terça');
    expect(describeRange({ from: '2026-09-25', to: '2026-09-25' })).toBe(
      '25/09/2026 - Sexta',
    );
    expect(describeRange({ from: '2026-09-22', to: '2026-09-28' })).toBe(
      '22/09/2026 a 28/09/2026',
    );
  });
});

describe('describeComparison', () => {
  const previous = { from: '2026-09-01', to: '2026-09-08' };

  it('período em andamento diz que vai até hoje e compara o mesmo trecho', () => {
    expect(
      describeComparison({
        from: '2026-10-01',
        to: '2026-10-31',
        elapsedTo: '2026-10-08',
        previous,
      }),
    ).toBe(
      'Até hoje (01/10/2026 a 08/10/2026), comparado com o mesmo trecho antes: 01/09/2026 a 08/09/2026',
    );
  });

  it('período terminado só diz com o que compara', () => {
    expect(
      describeComparison({
        from: '2026-09-01',
        to: '2026-09-30',
        elapsedTo: '2026-09-30',
        previous: { from: '2026-08-01', to: '2026-08-31' },
      }),
    ).toBe('Comparado com 01/08/2026 a 31/08/2026');
  });
});
