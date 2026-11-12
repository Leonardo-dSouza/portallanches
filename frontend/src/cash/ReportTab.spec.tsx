import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CashApi } from '../api/cash-api';
import type { Closing, ClosingReport, Order } from '../api/types';
import { ReportTab } from './ReportTab';
import type { CashDay } from './use-cash-day';

class FakeReportTabCashApi {
  report: ClosingReport;

  constructor(report: ClosingReport) {
    this.report = report;
  }

  async reportToday(): Promise<ClosingReport> {
    return this.report;
  }

  async closeToday(): Promise<Closing> {
    return { id: 1, businessDate: '2026-10-10', status: 'CLOSED' };
  }
}

function makeReport(countRequired: boolean): ClosingReport {
  return {
    businessDate: '2026-10-10',
    status: 'OPEN',
    orders: { count: 1, total: '25.00' },
    splitOrdersCount: 0,
    ordersWithoutFiado: { count: 1, total: '25.00' },
    revenue: '25.00',
    byPaymentMethod: [],
    withoutPaymentMethod: { count: 0, total: '0.00' },
    delivery: { count: 0, feesTotal: '0.00' },
    motoboy: { dailyRate: '0.00', deliveryFees: '0.00', totalCost: '0.00' },
    expenses: { count: 0, total: '0.00' },
    fiadoReceived: { count: 0, total: '0.00', extra: '0.00', received: '0.00' },
    drawer: {
      openingCash: '30.00',
      cashTolerance: '2.00',
      countRequired,
      toCount: [
        { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
        { paymentMethodId: 2, name: 'PIX', isCash: false },
      ],
      check: null,
    },
  };
}

function makeDay(orders: Order[] = []): CashDay {
  return {
    closing: { id: 1, businessDate: '2026-10-10', status: 'OPEN' },
    orders,
    paymentMethods: [],
    zones: [],
    expenseTypes: [],
    expenses: [],
    menu: [],
    staffConsumptions: [],
    consumerNames: [],
    fiadoDebtors: [],
    fiadoSettled: [],
    fiadoDue: [],
  };
}

describe('ReportTab', () => {
  it('monta o formulário de contagem quando countRequired é true', async () => {
    const api = new FakeReportTabCashApi(makeReport(true));
    render(
      <ReportTab
        cash={api as unknown as CashApi}
        day={makeDay()}
        onChanged={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(
        'Conte a gaveta, o PIX e cada maquininha. Fechar o dia grava a contagem.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Dinheiro (com o troco inicial)'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('PIX')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Conferir e fechar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar o dia' })).toBeNull();
  });

  it('monta o CloseDayButton quando countRequired é false (dia passado/admin)', async () => {
    const api = new FakeReportTabCashApi(makeReport(false));
    render(
      <ReportTab
        cash={api as unknown as CashApi}
        day={makeDay()}
        onChanged={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('Confira os totais acima antes de fechar o dia.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Fechar o dia' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Conferir e fechar' }),
    ).toBeNull();
    expect(
      screen.queryByLabelText('Dinheiro (com o troco inicial)'),
    ).toBeNull();
  });

  it('bloqueia o botão do formulário quando existem contas A pagar abertas', async () => {
    const api = new FakeReportTabCashApi(makeReport(true));
    const openOrder = {
      id: 99,
      dayNumber: 5,
      type: 'COUNTER',
      customerName: 'Carlos',
      amount: '32.00',
      paymentMethodId: null,
      paymentMode: null,
      canceledAt: null,
    } as unknown as Order;

    render(
      <ReportTab
        cash={api as unknown as CashApi}
        day={makeDay([openOrder])}
        onChanged={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(
        'Receba as contas A pagar antes de fechar o dia:',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Conferir e fechar' }),
    ).toBeDisabled();
  });
});
