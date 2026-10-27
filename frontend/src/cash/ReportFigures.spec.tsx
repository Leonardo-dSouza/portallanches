import { render, screen, within } from '@testing-library/react';
import type { ClosingReport } from '../api/types';
import { ReportFigures } from './ReportFigures';

const REPORT: ClosingReport = {
  businessDate: '2026-10-10',
  status: 'OPEN',
  orders: { count: 5, total: '180.00' },
  ordersWithoutFiado: { count: 5, total: '180.00' },
  byPaymentMethod: [],
  withoutPaymentMethod: { count: 0, total: '0.00' },
  delivery: { count: 3, feesTotal: '15.00' },
  motoboy: { dailyRate: '50.00', deliveryFees: '15.00', totalCost: '65.00' },
  expenses: { count: 0, total: '0.00' },
};

describe('ReportFigures', () => {
  it('no bloco do motoboy vem a diária, depois as taxas e o total (pedido de 2026-10-10)', () => {
    render(<ReportFigures report={REPORT} />);
    const block = screen
      .getByRole('heading', { name: 'Entregas e motoboy' })
      .closest('section')!;
    const terms = within(block)
      .getAllByRole('term')
      .map((term) => term.textContent);
    const values = within(block)
      .getAllByRole('definition')
      .map((value) => value.textContent);
    expect(terms).toEqual(['Diária', 'Taxas (3 entregas)', 'Total do motoboy']);
    expect(values).toEqual(['R$ 50,00', 'R$ 15,00', 'R$ 65,00']);
  });

  it('no dia aberto, os pedidos sem forma são as contas abertas (2026-10-10)', () => {
    const withOpen = {
      ...REPORT,
      withoutPaymentMethod: { count: 1, total: '23.00' },
    };
    const { rerender } = render(<ReportFigures report={withOpen} />);
    expect(screen.getByText('A pagar (1)')).toBeInTheDocument();
    rerender(<ReportFigures report={{ ...withOpen, status: 'CLOSED' }} />);
    expect(screen.getByText('Sem forma de pagamento (1)')).toBeInTheDocument();
  });

  it('consumo interno à parte, pelo custo, com os itens sem custo (2026-10-23)', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          staffConsumption: {
            count: 2,
            cmvTotal: '21.72',
            missingCostCount: 1,
          },
        }}
      />,
    );
    const block = screen
      .getByRole('heading', { name: 'Consumo interno' })
      .closest('section')!;
    expect(within(block).getByRole('term')).toHaveTextContent(
      'Custo (2 lançamentos)',
    );
    expect(within(block).getByRole('definition')).toHaveTextContent('R$ 21,72');
    expect(block).toHaveTextContent('1 item sem custo');
    expect(block).toHaveTextContent('fora dos gastos');
  });

  /** A noite de 25/10 da produção: 14 pagos, 1 fiado e 1 cancelado (pedido de 2026-10-27). */
  const pix = {
    paymentMethodId: 1,
    name: 'PIX',
    ordersCount: 6,
    total: '319.20',
    byMode: [],
    isFiado: false,
  };
  const NIGHT: ClosingReport = {
    ...REPORT,
    orders: { count: 15, total: '759.20' },
    ordersWithoutFiado: { count: 14, total: '575.30' },
    byPaymentMethod: [
      pix,
      {
        ...pix,
        paymentMethodId: 9,
        name: 'Fiado',
        ordersCount: 1,
        total: '183.90',
        isFiado: true,
      },
    ],
    canceled: {
      count: 1,
      total: '84.10',
      orders: [{ dayNumber: 12, amount: '84.10', reason: 'Pedido duplicado' }],
    },
  };
  const salesTerms = () =>
    within(screen.getByRole('heading', { name: 'Vendas' }).closest('section')!)
      .getAllByRole('term')
      .map((term) => term.textContent);

  it('Vendas (2026-10-27): pedidos sem o fiado, o fiado não pago, as formas e os cancelados com o motivo', () => {
    render(<ReportFigures report={NIGHT} />);
    expect(salesTerms()).toEqual([
      'Pedidos (14)',
      'Fiado (1), não pago',
      'PIX (6)',
      'Cancelados (1), fora do total',
      '#12 Pedido duplicado',
    ]);
    const sales = screen
      .getByRole('heading', { name: 'Vendas' })
      .closest('section')!;
    const values = within(sales)
      .getAllByRole('definition')
      .map((value) => value.textContent);
    expect(values).toEqual([
      'R$ 575,30',
      'R$ 183,90',
      'R$ 319,20',
      'R$ 84,10',
      'R$ 84,10',
    ]);
  });

  it('sem fiado nem cancelado, Vendas tem os pedidos e as formas; o quadro Gaveta saiu (2026-10-27)', () => {
    render(
      <ReportFigures
        report={{
          ...NIGHT,
          ordersWithoutFiado: { count: 6, total: '319.20' },
          byPaymentMethod: [pix],
          canceled: { count: 0, total: '0.00', orders: [] },
        }}
      />,
    );
    expect(salesTerms()).toEqual(['Pedidos (6)', 'PIX (6)']);
    expect(screen.queryByRole('heading', { name: 'Gaveta' })).toBeNull();
  });

  it('cancelado sem motivo gravado mostra só o número', () => {
    render(
      <ReportFigures
        report={{
          ...NIGHT,
          canceled: {
            count: 1,
            total: '84.10',
            orders: [{ dayNumber: 12, amount: '84.10', reason: null }],
          },
        }}
      />,
    );
    expect(salesTerms()).toContain('#12');
  });

  it('recebido de fiado na noite: por forma, com o adicional à parte', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          fiadoReceived: {
            count: 1,
            total: '20.00',
            extra: '5.00',
            byPaymentMethod: [{ ...pix, ordersCount: 1, total: '20.00' }],
          },
        }}
      />,
    );
    const received = screen
      .getByRole('heading', { name: 'Recebido de fiado' })
      .closest('section')!;
    const terms = within(received)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['Recebido (1)', 'PIX (1)', 'Adicional']);
    expect(received).toHaveTextContent('R$ 5,00');
  });

  it('sem recebimento de fiado, o quadro dele não aparece', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          fiadoReceived: {
            count: 0,
            total: '0.00',
            extra: '0.00',
            byPaymentMethod: [],
          },
        }}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Recebido de fiado' }),
    ).toBeNull();
  });

  it('sem consumo no dia, o bloco não aparece', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          staffConsumption: { count: 0, cmvTotal: '0.00', missingCostCount: 0 },
        }}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Consumo interno' }),
    ).toBeNull();
  });
});
