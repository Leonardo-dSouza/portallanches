import { describe, expect, it } from 'vitest';
import {
  drawerCountedByText,
  drawerLineResultText,
} from './drawer-figures-text';

describe('drawerLineResultText', () => {
  it('MATCH com diferença zero vira "Bateu"', () => {
    expect(drawerLineResultText('MATCH', '0.00')).toBe('Bateu');
  });

  it('MATCH com sobra (dentro da tolerância do dinheiro) diz quanto sobrou', () => {
    expect(drawerLineResultText('MATCH', '1.50')).toBe(
      'Bateu (sobrou R$ 1,50)',
    );
  });

  it('MATCH com falta (dentro da tolerância do dinheiro) diz quanto faltou', () => {
    expect(drawerLineResultText('MATCH', '-1.50')).toBe(
      'Bateu (faltou R$ 1,50)',
    );
  });

  it('OVER fora da tolerância diz quanto sobrou', () => {
    expect(drawerLineResultText('OVER', '5.00')).toBe('Sobrou R$ 5,00');
  });

  it('SHORT fora da tolerância diz quanto faltou', () => {
    expect(drawerLineResultText('SHORT', '-5.00')).toBe('Faltou R$ 5,00');
  });
});

describe('drawerCountedByText', () => {
  it('formata o nome e a hora no fuso de Brasília', () => {
    expect(drawerCountedByText('Ana', '2026-10-10T23:41:00Z')).toBe(
      'Contado por Ana às 20:41',
    );
  });
});
