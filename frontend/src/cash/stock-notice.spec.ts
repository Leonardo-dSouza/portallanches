import { shortfallNotice, stockLeftLabel } from './stock-notice';

describe('stockLeftLabel', () => {
  it('fala o saldo como o balcão fala', () => {
    expect(stockLeftLabel(0)).toBe('sem estoque');
    expect(stockLeftLabel(1)).toBe('resta 1');
    expect(stockLeftLabel(4)).toBe('restam 4');
  });
});

describe('shortfallNotice', () => {
  it('sem diferença não avisa', () => {
    expect(shortfallNotice([])).toBeNull();
  });

  it('lista o que faltou e pede a conferência', () => {
    const notice = shortfallNotice([
      { supplyId: 30, supplyName: 'Coca Cola Lt 350ml', missing: '1' },
      { supplyId: 31, supplyName: 'Guaraná lata', missing: '2' },
    ]);
    expect(notice).toBe(
      'Vendido além do estoque do sistema: Coca Cola Lt 350ml (faltou 1), Guaraná lata (faltou 2). Lance a entrada ou conte em Estoque.',
    );
  });
});
