import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_CASH_SHORTCUTS,
  parseCashShortcuts,
  readStoredShortcuts,
} from './cash-shortcuts.js';

const chosen = { save: 'F9', toggleType: 'F2', addons: 'F4', clearAll: 'F8' };

describe('parseCashShortcuts', () => {
  it('aceita uma tecla da lista para cada ação', () => {
    expect(parseCashShortcuts(chosen)).toEqual(chosen);
  });

  it('recusa tecla fora da lista citando a recebida', () => {
    expect(() => parseCashShortcuts({ ...chosen, save: 'F5' })).toThrow(
      /cashShortcuts.save.*"F5"/,
    );
  });

  it('recusa a mesma tecla em duas ações, citando as duas', () => {
    expect(() => parseCashShortcuts({ ...chosen, clearAll: 'F9' })).toThrow(
      /"F9" está em save e em clearAll/,
    );
  });

  it('recusa ação faltando', () => {
    const { addons: _, ...missing } = chosen;
    expect(() => parseCashShortcuts(missing)).toThrow(BadRequestException);
  });
});

describe('readStoredShortcuts', () => {
  it('sem valor ou estragado vira o padrão', () => {
    expect(readStoredShortcuts(null)).toEqual(DEFAULT_CASH_SHORTCUTS);
    expect(readStoredShortcuts('{oops')).toEqual(DEFAULT_CASH_SHORTCUTS);
    expect(readStoredShortcuts('{"save":"F5"}')).toEqual(
      DEFAULT_CASH_SHORTCUTS,
    );
  });

  it('lê o que foi gravado', () => {
    expect(readStoredShortcuts(JSON.stringify(chosen))).toEqual(chosen);
  });
});
