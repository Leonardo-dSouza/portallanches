import { render, screen, within } from '@testing-library/react';
import type { ClosingReport } from '../api/types';
import { ReportFigures } from './ReportFigures';

const REPORT: ClosingReport = {
  businessDate: '2026-10-10',
  status: 'OPEN',
  orders: { count: 5, total: '180.00' },
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

  it('fiado (2026-10-25): a forma fica "a receber", o recebido sai por forma com o adicional, e o que entrou no caixa', () => {
    const pix = {
      paymentMethodId: 1,
      name: 'PIX',
      ordersCount: 3,
      total: '100.00',
      byMode: [],
      isFiado: false,
    };
    render(
      <ReportFigures
        report={{
          ...REPORT,
          byPaymentMethod: [
            pix,
            {
              ...pix,
              paymentMethodId: 7,
              name: 'Fiado',
              ordersCount: 2,
              total: '80.00',
              isFiado: true,
            },
          ],
          fiadoReceived: {
            count: 1,
            total: '20.00',
            extra: '5.00',
            byPaymentMethod: [{ ...pix, ordersCount: 1, total: '20.00' }],
          },
          cashIn: '125.00',
        }}
      />,
    );
    expect(
      screen.getByText('Fiado (2), a receber fora da gaveta'),
    ).toBeInTheDocument();
    const received = screen
      .getByRole('heading', { name: 'Recebido de fiado' })
      .closest('section')!;
    const terms = within(received)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['Recebido (1)', 'PIX (1)', 'Adicional']);
    expect(received).toHaveTextContent('R$ 5,00');
    const drawer = screen
      .getByRole('heading', { name: 'Gaveta' })
      .closest('section')!;
    expect(within(drawer).getByRole('term')).toHaveTextContent(
      'Entrou no caixa',
    );
    expect(within(drawer).getByRole('definition')).toHaveTextContent(
      'R$ 125,00',
    );
  });

  it('sem recebimento de fiado, o quadro dele não aparece; sem o cashIn (período), nem a gaveta', () => {
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
    expect(screen.queryByRole('heading', { name: 'Gaveta' })).toBeNull();
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
