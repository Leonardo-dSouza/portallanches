import { describe, expect, it } from 'vitest';
import type { PaymentMethod, PaymentPart } from '../api/types';
import {
  addOnParts,
  appendRemainingPart,
  carryHintOf,
  cashAmountOf,
  closeSplitChoice,
  describePaymentPart,
  firstSplitProblem,
  isSplitOrder,
  openSplitChoice,
  partAmountToCents,
  partsTotalCents,
  splitDifferenceCents,
  splitDifferenceLabel,
  toApiPaymentParts,
  splitOrdersNote,
  toSplitPartDrafts,
  type SplitPartDraft,
} from './split-payment';
import { SPLIT } from './payment-choice';

const DINHEIRO: PaymentMethod = {
  id: 1,
  name: 'Dinheiro',
  active: true,
  sortOrder: 1,
  isCardTerminal: false,
  isCash: true,
  isFiado: false,
};

const PIX: PaymentMethod = {
  id: 2,
  name: 'PIX',
  active: true,
  sortOrder: 2,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
};

const TON: PaymentMethod = {
  id: 3,
  name: 'Maquininha Ton',
  active: true,
  sortOrder: 3,
  isCardTerminal: true,
  isCash: false,
  isFiado: false,
};

const FIADO: PaymentMethod = {
  id: 4,
  name: 'Fiado',
  active: true,
  sortOrder: 4,
  isCardTerminal: false,
  isCash: false,
  isFiado: true,
};

const METHODS = [DINHEIRO, PIX, TON, FIADO];

describe('split-payment: cálculos de valor e falta/sobra', () => {
  it('converte valor digitado em centavos inteiros', () => {
    expect(partAmountToCents('25,50')).toBe(2550);
    expect(partAmountToCents('25.5')).toBe(2550);
    expect(partAmountToCents('')).toBe(0);
    expect(partAmountToCents('abc')).toBe(0);
  });

  it('soma o total das partes em centavos', () => {
    const parts: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
      { paymentMethodId: '2', paymentMode: '', amount: '15,50' },
    ];
    expect(partsTotalCents(parts)).toBe(3550);
  });

  it('calcula o que falta ou sobra em centavos e rótulo', () => {
    const parts: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
    ];
    expect(splitDifferenceCents(5000, parts)).toBe(3000);
    expect(splitDifferenceLabel(5000, parts)).toBe('Falta R$ 30,00');

    const surplus: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '60,00' },
    ];
    expect(splitDifferenceCents(5000, surplus)).toBe(-1000);
    expect(splitDifferenceLabel(5000, surplus)).toBe('Sobra R$ 10,00');

    const exact: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '50,00' },
    ];
    expect(splitDifferenceCents(5000, exact)).toBe(0);
    expect(splitDifferenceLabel(5000, exact)).toBe('Falta R$ 0,00');
  });
});

describe('split-payment: abrir, fechar e a próxima linha', () => {
  it('appendRemainingPart adiciona nova linha com o que falta já preenchido', () => {
    const parts: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
    ];
    const updated = appendRemainingPart(parts, 5000);
    expect(updated).toHaveLength(2);
    expect(updated[1]).toEqual({
      paymentMethodId: '',
      paymentMode: '',
      amount: '30,00',
    });
  });

  it('openSplitChoice leva a forma escolhida para a 1ª linha', () => {
    const opened = openSplitChoice({
      paymentMethodId: '3',
      paymentMode: 'DEBIT' as const,
      splitParts: [] as SplitPartDraft[],
    });
    expect(opened.paymentMethodId).toBe(SPLIT);
    expect(opened.splitParts).toEqual([
      { paymentMethodId: '3', paymentMode: 'DEBIT', amount: '' },
    ]);
  });

  it('openSplitChoice sem forma começa a linha vazia', () => {
    const opened = openSplitChoice({
      paymentMethodId: '',
      paymentMode: '' as const,
      splitParts: [] as SplitPartDraft[],
    });
    expect(opened.splitParts[0].paymentMethodId).toBe('');
  });

  it('closeSplitChoice volta para nenhuma forma, sem partes', () => {
    const closed = closeSplitChoice({
      paymentMethodId: SPLIT,
      paymentMode: '' as const,
      splitParts: [{ paymentMethodId: '1', paymentMode: '', amount: '1' }],
    });
    expect(closed).toEqual({
      paymentMethodId: '',
      paymentMode: '',
      splitParts: [] as SplitPartDraft[],
    });
  });
});

describe('split-payment: validações de primeiro problema', () => {
  const problem = (parts: SplitPartDraft[], change = '') =>
    firstSplitProblem(parts, 5000, METHODS, change);
  const part = (id: string, amount: string, mode = ''): SplitPartDraft => ({
    paymentMethodId: id,
    paymentMode: mode as SplitPartDraft['paymentMode'],
    amount,
  });

  it('exige pelo menos duas partes', () => {
    expect(problem([part('1', '50,00')])).toBe(
      'O pagamento dividido precisa de 2 partes ou mais',
    );
  });

  it('diz qual parte está sem forma', () => {
    expect(problem([part('1', '20,00'), part('', '30,00')])).toBe(
      'Escolha a forma da parte 2',
    );
  });

  it('recusa fiado e ensina o caminho do fiado parcial', () => {
    expect(problem([part('2', '20,00'), part('4', '30,00')])).toBe(
      'Fiado não divide: lance o pedido como fiado e receba a parte paga',
    );
  });

  it('exige o meio na maquininha', () => {
    expect(problem([part('2', '20,00'), part('3', '30,00')])).toBe(
      'Escolha crédito, débito ou PIX na Maquininha Ton (teclas 1 a 3)',
    );
  });

  it('recusa dinheiro em mais de uma parte', () => {
    expect(problem([part('1', '20,00'), part('1', '30,00')])).toBe(
      'O Dinheiro entra numa parte só (some os valores)',
    );
  });

  it('dois Ton débito passam (duas vendas na maquininha)', () => {
    expect(
      problem([part('3', '20,00', 'DEBIT'), part('3', '30,00', 'DEBIT')]),
    ).toBeNull();
  });

  it('diz qual parte está sem valor', () => {
    expect(problem([part('1', '0,00'), part('2', '50,00')])).toBe(
      'Digite o valor da parte 1',
    );
  });

  it('mostra o que falta ou sobra na soma das partes', () => {
    expect(problem([part('1', '20,00'), part('2', '20,00')])).toBe(
      'Falta R$ 10,00',
    );
    expect(problem([part('1', '20,00'), part('2', '40,00')])).toBe(
      'Sobra R$ 10,00',
    );
  });

  it('o troco vale contra a parte em dinheiro, não contra o total', () => {
    const parts = [part('1', '20,00'), part('2', '30,00')];
    expect(problem(parts, '20,00')).toBeNull();
    expect(problem(parts, '15,00')).toBe(
      'Troco para R$ 15,00 é menor que a parte em dinheiro (R$ 20,00)',
    );
    expect(
      problem([part('2', '20,00'), part('3', '30,00', 'DEBIT')], '50,00'),
    ).toBe('"Troco para" só vale com uma parte em Dinheiro');
  });
});

describe('split-payment: conversões com a API', () => {
  it('converte rascunho para PaymentPart da API', () => {
    const drafts: SplitPartDraft[] = [
      { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
      { paymentMethodId: '3', paymentMode: 'DEBIT', amount: '30,00' },
    ];
    expect(toApiPaymentParts(drafts)).toEqual([
      { paymentMethodId: 1, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
    ]);
  });

  it('converte PaymentPart da API para rascunho com vírgula', () => {
    const apiParts: PaymentPart[] = [
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
    ];
    expect(toSplitPartDrafts(apiParts)).toEqual([
      { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
      { paymentMethodId: '3', paymentMode: 'DEBIT', amount: '30,00' },
    ]);
  });
});

describe('split-payment: addOnParts (+ Item)', () => {
  it('mesma forma e meio soma na parte existente', () => {
    const initial: PaymentPart[] = [
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
    ];
    const updated = addOnParts(initial, 3, 'DEBIT', 1500);
    expect(updated).toEqual([
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '45.00' },
    ]);
  });

  it('forma ou meio diferente vira nova parte no fim', () => {
    const initial: PaymentPart[] = [
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
    ];
    const withPix = addOnParts(initial, 2, null, 1000);
    expect(withPix).toEqual([
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
      { paymentMethodId: 2, paymentMode: null, amount: '10.00' },
    ]);

    const withTonCredit = addOnParts(initial, 3, 'CREDIT', 1200);
    expect(withTonCredit).toEqual([
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
      { paymentMethodId: 3, paymentMode: 'CREDIT', amount: '12.00' },
    ]);
  });
});

describe('split-payment: exibição', () => {
  const parts: PaymentPart[] = [
    { paymentMethodId: 2, paymentMode: null, amount: '10.00' },
    { paymentMethodId: 1, paymentMode: null, amount: '28.20' },
  ];

  it('isSplitOrder: só 2 partes ou mais', () => {
    expect(isSplitOrder({ paymentParts: parts })).toBe(true);
    expect(isSplitOrder({ paymentParts: [] })).toBe(false);
    expect(isSplitOrder({})).toBe(false);
  });

  it('describePaymentPart: forma, meio e valor', () => {
    const ton = {
      paymentMethodId: 3,
      paymentMode: 'DEBIT' as const,
      amount: '30.00',
    };
    expect(describePaymentPart(ton, METHODS)).toBe(
      'Maquininha Ton · Débito R$ 30,00',
    );
  });

  it('cashAmountOf: a parte em dinheiro no dividido, o total nos outros', () => {
    expect(
      cashAmountOf({ amount: '38.20', paymentParts: parts }, METHODS),
    ).toBe('28.20');
    expect(cashAmountOf({ amount: '38.20', paymentParts: [] }, METHODS)).toBe(
      '38.20',
    );
  });

  it('carryHintOf: o que o motoboy leva; nada com troco menor', () => {
    expect(carryHintOf('100,00', '28,20')).toBe('(levar R$ 71,80)');
    expect(carryHintOf('20,00', '28,20')).toBeNull();
    expect(carryHintOf('', '28,20')).toBeNull();
  });

  it('splitOrdersNote: singular, plural e nada', () => {
    expect(splitOrdersNote(1)).toBe('1 pedido dividido');
    expect(splitOrdersNote(3)).toBe('3 pedidos divididos');
    expect(splitOrdersNote(0)).toBeNull();
  });
});
