// Dados iniciais do Sprint 1. Valores de diária e bairros são exemplos de
// desenvolvimento: o admin ajusta depois pela aplicação.

// Na ordem das teclas do caixa (1 a 4); as maquininhas pedem crédito, débito ou PIX.
export const PAYMENT_METHODS: readonly {
  name: string;
  isCardTerminal: boolean;
}[] = [
  { name: 'Dinheiro', isCardTerminal: false },
  { name: 'PIX', isCardTerminal: false },
  { name: 'Maquininha Ton', isCardTerminal: true },
  { name: 'Maquininha PagBank', isCardTerminal: true },
];

export const EXPENSE_TYPE_NAMES: readonly string[] = [
  'Compra no Atacadão',
  'Gás',
  'Freelancers',
];

export const DELIVERY_ZONES: readonly { neighborhood: string; fee: string }[] =
  [
    { neighborhood: 'Monterrey', fee: '3.00' },
    { neighborhood: 'Centro', fee: '5.00' },
  ];

export const MOTOBOY_RATES: readonly {
  dayGroup: 'TUE_THU' | 'FRI_SUN';
  amount: string;
}[] = [
  { dayGroup: 'TUE_THU', amount: '40.00' },
  { dayGroup: 'FRI_SUN', amount: '45.00' },
];
