import { render, screen, within } from '@testing-library/react';
import type { ClosingReport } from '../api/types';
import { ReportFigures } from './ReportFigures';

const REPORT: ClosingReport = {
  businessDate: '2026-10-10',
  status: 'OPEN',
  orders: { count: 5, total: '180.00' },
  splitOrdersCount: 0,
  ordersWithoutFiado: { count: 5, total: '180.00' },
  revenue: '180.00',
  byPaymentMethod: [],
  withoutPaymentMethod: { count: 0, total: '0.00' },
  delivery: { count: 3, feesTotal: '15.00' },
  motoboy: { dailyRate: '50.00', deliveryFees: '15.00', totalCost: '65.00' },
  expenses: { count: 0, total: '0.00' },
  fiadoReceived: { count: 0, total: '0.00', extra: '0.00', received: '0.00' },
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

  it('o A pagar fica à parte, fora do faturamento; o sem forma é só o importado (card 8)', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          withoutPaymentMethod: { count: 1, total: '23.00' },
          openAccounts: { count: 2, total: '35.20' },
        }}
      />,
    );
    expect(
      screen.getByText('A receber (A pagar) (2), fora do faturamento'),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 35,20')).toBeInTheDocument();
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
  };
  const NIGHT: ClosingReport = {
    ...REPORT,
    orders: { count: 15, total: '759.20' },
    ordersWithoutFiado: { count: 14, total: '575.30' },
    revenue: '575.30',
    byPaymentMethod: [pix],
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

  it('Vendas (2026-11-01): faturamento, pedidos sem o fiado, as formas e os cancelados com o motivo', () => {
    render(<ReportFigures report={NIGHT} />);
    expect(salesTerms()).toEqual([
      'Faturamento',
      'Pedidos (14)',
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
      'R$ 575,30',
      'R$ 319,20',
      'R$ 84,10',
      'R$ 84,10',
    ]);
  });

  it('a noite do pagamento soma o recebido de fiado no faturamento (2026-11-01)', () => {
    render(
      <ReportFigures
        report={{
          ...NIGHT,
          revenue: '515.20',
          ordersWithoutFiado: { count: 7, total: '321.30' },
          fiadoReceived: {
            count: 1,
            total: '183.90',
            extra: '10.00',
            received: '193.90',
          },
          canceled: { count: 0, total: '0.00', orders: [] },
        }}
      />,
    );
    expect(salesTerms()).toEqual([
      'Faturamento',
      'Pedidos (7)',
      'Recebido de fiado (1)',
      'PIX (6)',
    ]);
    expect(screen.getByText('R$ 515,20')).toBeInTheDocument();
    expect(screen.getByText('R$ 193,90')).toBeInTheDocument();
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
    expect(salesTerms()).toEqual(['Faturamento', 'Pedidos (6)', 'PIX (6)']);
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

  it('recebido de fiado na noite: quem pagou, o que abateu, o adicional e a forma (2026-11-01)', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          fiadoReceipts: [
            {
              orderDayNumber: 16,
              orderBusinessDate: '2026-10-25',
              customerName: 'Alemão',
              amount: '183.90',
              extra: '10.00',
              received: '193.90',
              paymentMethodName: 'Cartão Ton',
              paymentMode: 'DEBIT',
            },
          ],
        }}
      />,
    );
    const received = screen
      .getByRole('heading', { name: 'Recebido de fiado' })
      .closest('section')!;
    const terms = within(received)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['#16 de dom 25/10 · Alemão']);
    expect(received).toHaveTextContent('R$ 193,90');
    expect(received).toHaveTextContent(
      'R$ 183,90 + adicional R$ 10,00 · Cartão Ton · Débito',
    );
  });

  it('sem recebimento de fiado, o quadro dele não aparece', () => {
    render(<ReportFigures report={{ ...REPORT, fiadoReceipts: [] }} />);
    expect(
      screen.queryByRole('heading', { name: 'Recebido de fiado' }),
    ).toBeNull();
  });

  it('fiado da noite: o pedido com a situação de hoje (2026-11-01)', () => {
    render(
      <ReportFigures
        report={{
          ...REPORT,
          fiadoSold: [
            {
              dayNumber: 16,
              customerName: 'Alemão',
              amount: '183.90',
              paidTotal: '0.00',
              remaining: '183.90',
              lastPaidOn: null,
            },
          ],
        }}
      />,
    );
    const sold = screen
      .getByRole('heading', { name: 'Fiado da noite' })
      .closest('section')!;
    expect(within(sold).getAllByRole('term')[0]).toHaveTextContent(
      '#16 Alemão',
    );
    expect(sold).toHaveTextContent('R$ 183,90');
    expect(sold).toHaveTextContent('não pago, não entra no faturamento');
  });

  it('sem fiado vendido na noite, o quadro dele não aparece', () => {
    render(<ReportFigures report={{ ...REPORT, fiadoSold: [] }} />);
    expect(
      screen.queryByRole('heading', { name: 'Fiado da noite' }),
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

  it('mostra nota de pedidos divididos quando splitOrdersCount > 0 no singular e plural', () => {
    const { rerender } = render(
      <ReportFigures report={{ ...REPORT, splitOrdersCount: 1 }} />,
    );
    expect(screen.getByText('1 pedido dividido')).toBeInTheDocument();

    rerender(<ReportFigures report={{ ...REPORT, splitOrdersCount: 3 }} />);
    expect(screen.getByText('3 pedidos divididos')).toBeInTheDocument();

    rerender(<ReportFigures report={{ ...REPORT, splitOrdersCount: 0 }} />);
    expect(screen.queryByText(/pedido.*dividido/)).toBeNull();
  });
});
