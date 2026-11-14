import { describe, expect, it } from 'vitest';
import { paidUnitCost, priceAlert } from './price-alert.js';

describe('priceAlert', () => {
  it('calcula alerta quando o preço pago por unidade é acima da base', () => {
    const alert = priceAlert('45.79', '36', '1.2444');
    expect(alert).toEqual({
      paidPerUnit: '1.2719',
      basePerUnit: '1.2444',
      diffPercent: '2.2',
      above: true,
    });
  });

  it('calcula alerta quando o preço pago por unidade é abaixo da base', () => {
    const alert = priceAlert('36.90', '36', '1.2444');
    expect(alert).toEqual({
      paidPerUnit: '1.025',
      basePerUnit: '1.2444',
      diffPercent: '-17.6',
      above: false,
    });
  });

  it('devolve null quando baseUnitCost é nulo', () => {
    expect(priceAlert('45.79', '36', null)).toBeNull();
  });

  it('devolve diffPercent 0.0 e above false quando pago é igual à base', () => {
    const alert = priceAlert('12.444', '10', '1.2444');
    expect(alert).toEqual({
      paidPerUnit: '1.2444',
      basePerUnit: '1.2444',
      diffPercent: '0.0',
      above: false,
    });
  });

  it('rejeita quantidade base menor ou igual a zero', () => {
    expect(() => priceAlert('45.79', '0', '1.2444')).toThrow(
      'Quantidade base 0 inválida: esperado maior que zero',
    );
  });
});

describe('paidUnitCost', () => {
  it('calcula o custo por unidade com 4 casas e meio sobe', () => {
    expect(paidUnitCost('44.89', '36')).toBe('1.2469');
  });

  it('normaliza o custo tirando zeros à direita', () => {
    expect(paidUnitCost('36.50', '1')).toBe('36.5');
  });
});
