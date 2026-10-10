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
});
