import { initialStatus, statusForType, stepStatus } from './order-status.js';

describe('initialStatus', () => {
  it('na noite em andamento nasce Em preparo; no caixa atrasado, já Entregue', () => {
    expect(initialStatus(true)).toBe('PREPARING');
    expect(initialStatus(false)).toBe('DELIVERED');
  });
});

describe('stepStatus', () => {
  it('entrega: Em preparo → Saiu → Entregue, e volta pelo mesmo caminho', () => {
    expect(stepStatus('DELIVERY', 'PREPARING', 1)).toBe('OUT_FOR_DELIVERY');
    expect(stepStatus('DELIVERY', 'OUT_FOR_DELIVERY', 1)).toBe('DELIVERED');
    expect(stepStatus('DELIVERY', 'DELIVERED', -1)).toBe('OUT_FOR_DELIVERY');
  });

  it('balcão: Em preparo → Entregue (sem o Saiu)', () => {
    expect(stepStatus('COUNTER', 'PREPARING', 1)).toBe('DELIVERED');
    expect(stepStatus('COUNTER', 'DELIVERED', -1)).toBe('PREPARING');
  });

  it('nas pontas não há passo: null', () => {
    expect(stepStatus('DELIVERY', 'DELIVERED', 1)).toBeNull();
    expect(stepStatus('COUNTER', 'PREPARING', -1)).toBeNull();
  });
});

describe('statusForType', () => {
  it('pedido que vira balcão com "Saiu" volta para Em preparo; os outros ficam', () => {
    expect(statusForType('COUNTER', 'OUT_FOR_DELIVERY')).toBe('PREPARING');
    expect(statusForType('COUNTER', 'DELIVERED')).toBe('DELIVERED');
    expect(statusForType('DELIVERY', 'PREPARING')).toBe('PREPARING');
  });
});
