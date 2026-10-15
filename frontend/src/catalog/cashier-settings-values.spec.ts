import { describe, expect, it } from 'vitest';
import { parseCashierSettings } from './cashier-settings-values';

const shortcuts = {
  save: 'F9',
  toggleType: 'F2',
  addons: 'F4',
  clearAll: 'F8',
};

describe('parseCashierSettings', () => {
  it('teclas diferentes e minutos de 0 a 120', () => {
    expect(parseCashierSettings({ shortcuts, fixMinutes: ' 15 ' })).toEqual({
      ok: true,
      value: { cashShortcuts: shortcuts, cashierFixMinutes: 15 },
    });
    expect(parseCashierSettings({ shortcuts, fixMinutes: '0' })).toMatchObject({
      ok: true,
      value: { cashierFixMinutes: 0 },
    });
  });

  it('a mesma tecla em duas ações cita as duas', () => {
    const repeated = { ...shortcuts, clearAll: 'F9' };
    expect(
      parseCashierSettings({ shortcuts: repeated, fixMinutes: '15' }),
    ).toEqual({
      ok: false,
      error:
        'A tecla F9 está em "Salvar pedido" e em "Limpar tudo": esperado uma tecla diferente para cada ação',
    });
  });

  it('tecla não escolhida', () => {
    const empty = { ...shortcuts, addons: '' };
    expect(
      parseCashierSettings({ shortcuts: empty, fixMinutes: '15' }),
    ).toEqual({
      ok: false,
      error: 'Escolha a tecla de "Adicionais da última linha"',
    });
  });

  it('minutos acima de 120, fração ou texto são recusados citando o digitado', () => {
    for (const fixMinutes of ['121', '1,5', 'dez', '']) {
      const parsed = parseCashierSettings({ shortcuts, fixMinutes });
      expect(parsed).toMatchObject({ ok: false });
      if (!parsed.ok) expect(parsed.error).toContain(`"${fixMinutes}"`);
    }
  });
});
