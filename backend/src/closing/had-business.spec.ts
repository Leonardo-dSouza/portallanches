import { describe, expect, it } from 'vitest';
import { hadBusiness } from './had-business.js';

describe('hadBusiness', () => {
  it('sem nenhum pedido não teve expediente', () => {
    expect(hadBusiness([])).toBe(false);
  });

  it('com todos os pedidos cancelados não teve expediente', () => {
    const onlyCanceled = [
      { canceled: { dayNumber: 1, reason: 'Lançado por engano' } },
      { canceled: { dayNumber: 2, reason: 'Cliente desistiu' } },
    ];
    expect(hadBusiness(onlyCanceled)).toBe(false);
  });

  it('com todos os pedidos com canceledAt preenchido não teve expediente', () => {
    const onlyCanceledAt = [
      { canceledAt: new Date('2026-11-02T20:00:00Z') },
      { canceledAt: '2026-11-02T20:15:00Z' },
    ];
    expect(hadBusiness(onlyCanceledAt)).toBe(false);
  });

  it('com pelo menos um pedido válido teve expediente', () => {
    expect(hadBusiness([{ canceled: undefined }])).toBe(true);
  });

  it('com mistura de cancelados e um válido tem expediente', () => {
    const mixed = [
      { canceled: { dayNumber: 1, reason: 'Duplicado' } },
      { canceledAt: new Date('2026-11-02T20:00:00Z') },
      { canceled: undefined, canceledAt: null },
    ];
    expect(hadBusiness(mixed)).toBe(true);
  });
});
