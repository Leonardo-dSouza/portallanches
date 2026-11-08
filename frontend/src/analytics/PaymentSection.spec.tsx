import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentSection } from './PaymentSection';

describe('PaymentSection: nota de pedidos divididos', () => {
  const baseData = {
    byPaymentMethod: [
      {
        paymentMethodId: 1,
        name: 'PIX',
        ordersCount: 2,
        total: '40.00',
        byMode: [],
      },
    ],
    withoutPaymentMethod: { count: 0, total: '0.00' },
    fiadoToReceive: { count: 0, total: '0.00' },
  };

  it('mostra a nota no singular quando tem 1 pedido dividido', () => {
    render(<PaymentSection report={{ ...baseData, splitOrdersCount: 1 }} />);
    expect(screen.getByText('1 pedido dividido')).toBeInTheDocument();
  });

  it('mostra a nota no plural quando tem múltiplos pedidos divididos', () => {
    render(<PaymentSection report={{ ...baseData, splitOrdersCount: 4 }} />);
    expect(screen.getByText('4 pedidos divididos')).toBeInTheDocument();
  });

  it('não mostra a nota quando splitOrdersCount é zero', () => {
    render(<PaymentSection report={{ ...baseData, splitOrdersCount: 0 }} />);
    expect(screen.queryByText(/pedido.*dividido/)).toBeNull();
  });
});
