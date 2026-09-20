// Dados iniciais do Sprint 1. Valores de diária e bairros são exemplos de
// desenvolvimento: o admin ajusta depois pela aplicação.

export const PAYMENT_METHOD_NAMES: readonly string[] = [
  'PIX',
  'Dinheiro',
  'Cartão de débito',
  'Cartão de crédito',
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
  { dayGroup: 'FRI_SUN', amount: '60.00' },
];
