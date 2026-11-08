import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  assertBusinessDiscountRange,
  assertNoInvoiceDiscount,
  assertOutsidePositions,
  calculateInvoiceSplit,
  latestOutsideCodes,
  outsideGrossCentsOf,
  resolveBusinessDiscount,
  suggestedOutsidePositions,
} from './outside-items.js';

describe('calculateInvoiceSplit (exemplo real, 2026-11-08)', () => {
  // Exemplo real: a pagar 43,14; desconto 7,19; torresmo de fora 28,56 cheio.
  const REAL_INVOICE = {
    amountDueCents: 4314,
    outsideGrossCents: 2856,
    discountCents: 719,
  };

  it('ponta 1: desconto da lanchonete zero joga todo o desconto para o item de fora', () => {
    const result = calculateInvoiceSplit({
      ...REAL_INVOICE,
      businessDiscountCents: 0,
    });
    expect(result).toEqual({ outsideNetCents: 2137, businessCents: 2177 });
  });

  it('ponta 2: desconto da lanchonete inteiro mantém o comportamento de hoje', () => {
    const result = calculateInvoiceSplit({
      ...REAL_INVOICE,
      businessDiscountCents: 719,
    });
    expect(result).toEqual({ outsideNetCents: 2856, businessCents: 1458 });
  });

  it('valor no meio: desconto da lanchonete de R$ 3,00 reparte o desconto entre as duas partes', () => {
    const result = calculateInvoiceSplit({
      ...REAL_INVOICE,
      businessDiscountCents: 300,
    });
    expect(result).toEqual({ outsideNetCents: 2437, businessCents: 1877 });
  });

  it('sem item de fora: todo o valor a pagar fica para a lanchonete', () => {
    const result = calculateInvoiceSplit({
      ...REAL_INVOICE,
      outsideGrossCents: 0,
      businessDiscountCents: 0,
    });
    expect(result).toEqual({ outsideNetCents: 0, businessCents: 4314 });
  });
});

describe('assertBusinessDiscountRange (validação da faixa)', () => {
  it('aceita valores entre zero e o desconto total quando foraCheio >= desconto', () => {
    expect(() => assertBusinessDiscountRange('0.00', '7.19')).not.toThrow();
    expect(() => assertBusinessDiscountRange('3.50', '7.19')).not.toThrow();
    expect(() => assertBusinessDiscountRange('7.19', '7.19')).not.toThrow();
  });

  it('exige mínimo de max(0, desconto - foraCheio) quando o item de fora é menor que o desconto', () => {
    // Desconto 10.00 e item de fora 5.00 -> mínimo 5.00
    expect(() =>
      assertBusinessDiscountRange('5.00', '10.00', 500),
    ).not.toThrow();
    expect(() =>
      assertBusinessDiscountRange('7.50', '10.00', 500),
    ).not.toThrow();
    expect(() =>
      assertBusinessDiscountRange('10.00', '10.00', 500),
    ).not.toThrow();

    expect(() => assertBusinessDiscountRange('4.00', '10.00', 500)).toThrow(
      'Campo "businessDiscount" fora da faixa: recebido "4.00", esperado entre 5.00 e 10.00',
    );
    expect(() => assertBusinessDiscountRange('11.00', '10.00', 500)).toThrow(
      'Campo "businessDiscount" fora da faixa: recebido "11.00", esperado entre 5.00 e 10.00',
    );
  });

  it('rejeita valor acima do desconto total com mensagem da faixa e valor recebido', () => {
    expect(() => assertBusinessDiscountRange('8.00', '7.19')).toThrow(
      BadRequestException,
    );
    expect(() => assertBusinessDiscountRange('8.00', '7.19')).toThrow(
      'Campo "businessDiscount" fora da faixa: recebido "8.00", esperado entre 0.00 e 7.19',
    );
  });

  it('rejeita valor negativo', () => {
    expect(() => assertBusinessDiscountRange('-0.01', '7.19')).toThrow(
      BadRequestException,
    );
  });
});

describe('outsideGrossCentsOf', () => {
  it('soma apenas as linhas marcadas como fora em centavos', () => {
    const items = [
      { position: 1, total: '24.83' },
      { position: 2, total: '4.89' },
      { position: 3, total: '10.00' },
    ];
    expect(outsideGrossCentsOf(items, [2, 3])).toBe(1489);
    expect(outsideGrossCentsOf(items, [])).toBe(0);
  });
});

describe('resolveBusinessDiscount', () => {
  it('sem posições de fora grava o desconto inteiro', () => {
    expect(resolveBusinessDiscount([], '0.00', '7.19')).toBe('7.19');
    expect(resolveBusinessDiscount([], undefined, '7.19')).toBe('7.19');
  });

  it('com posições de fora mas ausente grava o desconto inteiro', () => {
    expect(resolveBusinessDiscount([1], undefined, '7.19')).toBe('7.19');
  });

  it('com posições e valor na faixa grava o valor escolhido', () => {
    expect(resolveBusinessDiscount([1], '2.50', '7.19')).toBe('2.50');
    expect(resolveBusinessDiscount([1], '5.00', '10.00', 500)).toBe('5.00');
  });

  it('com posições e valor abaixo do mínimo lança erro com a faixa esperada', () => {
    expect(() => resolveBusinessDiscount([1], '4.00', '10.00', 500)).toThrow(
      'Campo "businessDiscount" fora da faixa: recebido "4.00", esperado entre 5.00 e 10.00',
    );
  });
});

describe('assertNoInvoiceDiscount', () => {
  it('permite ausência de desconto', () => {
    expect(() => assertNoInvoiceDiscount(undefined)).not.toThrow();
  });

  it('rejeita desconto da lanchonete sem nota', () => {
    expect(() => assertNoInvoiceDiscount('5.00')).toThrow(BadRequestException);
    expect(() => assertNoInvoiceDiscount('5.00')).toThrow(
      'Campo "businessDiscount" sem nota: recebido "5.00", esperado apenas em gastos com nota fiscal',
    );
  });
});

describe('assertOutsidePositions', () => {
  it('aceita nenhuma ou algumas posições da nota', () => {
    expect(() => assertOutsidePositions([], 3)).not.toThrow();
    expect(() => assertOutsidePositions([1, 3], 3)).not.toThrow();
  });

  it('posição fora da nota é 400 com a posição e o intervalo', () => {
    expect(() => assertOutsidePositions([4], 3)).toThrow(BadRequestException);
    expect(() => assertOutsidePositions([4], 3)).toThrow(
      'Item 4 não existe na nota (itens 1 a 3)',
    );
  });

  it('a nota inteira fora da lanchonete não é gasto (422)', () => {
    expect(() => assertOutsidePositions([1, 2, 3], 3)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertOutsidePositions([3, 1, 2], 3)).toThrow(
      'A nota inteira está fora da lanchonete (3 de 3 itens): tire a nota do gasto ou desmarque um item',
    );
  });
});

describe('latestOutsideCodes', () => {
  it('vale a decisão da nota mais recente de cada código', () => {
    // Da mais nova para a mais antiga, como o repositório devolve.
    const codes = latestOutsideCodes([
      { code: 'pao', outsideBusiness: true },
      { code: 'bacon', outsideBusiness: false },
      { code: 'bacon', outsideBusiness: true },
      { code: 'pao', outsideBusiness: false },
    ]);
    expect([...codes]).toEqual(['pao']);
  });
});

describe('suggestedOutsidePositions', () => {
  it('marca as linhas com código lembrado (o produto repetido em várias linhas também)', () => {
    const items = [
      { position: 1, code: 'bacon' },
      { position: 2, code: 'pao' },
      { position: 3, code: 'pao' },
    ];
    expect(suggestedOutsidePositions(items, new Set(['pao']))).toEqual([2, 3]);
  });
});
