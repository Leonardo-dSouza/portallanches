import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  FiadoDebtor,
  FiadoOrderView,
  FiadoPayment,
  FiadoStatement,
} from '../api/fiado-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import { FAKE_ADMIN_PASSWORD } from '../test-support/fake-manager';
import { click, renderCashier, type } from '../test-support/render-cashier';

const OPEN_ORDER: FiadoOrderView = {
  orderId: 50,
  businessDate: '2026-09-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '50.00',
  paidTotal: '3.00',
  remaining: '47.00',
  dueDate: '2026-09-21',
};

const MARIA: FiadoDebtor = {
  customerId: 15,
  name: 'Maria',
  phone: '79999991234',
  openTotal: '47.00',
  orders: [OPEN_ORDER],
};

const JOAO: FiadoDebtor = {
  customerId: 16,
  name: 'João',
  phone: '79988887777',
  openTotal: '20.00',
  orders: [{ ...OPEN_ORDER, orderId: 51, dueDate: '2026-09-30' }],
};

const payment = (fields: Partial<FiadoPayment>): FiadoPayment => ({
  id: 901,
  orderId: 50,
  orderDayNumber: 5,
  orderBusinessDate: '2026-09-20',
  closingId: 10,
  businessDate: '2026-09-22',
  amount: '3.00',
  extra: '0.00',
  paymentMethodId: 1,
  paymentMode: null,
  // Agora: dentro da trava do caixa (15 min).
  createdAt: new Date().toISOString(),
  canceledAt: null,
  cancelReason: null,
  ...fields,
});

const STATEMENT: FiadoStatement = {
  customer: { id: 15, name: 'Maria', phone: '79999991234' },
  openTotal: '47.00',
  openOrders: [OPEN_ORDER],
  paidOrders: [
    {
      ...OPEN_ORDER,
      orderId: 40,
      businessDate: '2026-09-10',
      dayNumber: 2,
      amount: '30.00',
      paidTotal: '30.00',
      remaining: '0.00',
      dueDate: null,
    },
  ],
  payments: [
    payment({}),
    payment({
      id: 900,
      amount: '10.00',
      canceledAt: '2026-09-22T23:00:00Z',
      cancelReason: 'Valor errado',
    }),
    payment({
      id: 899,
      orderId: 40,
      orderDayNumber: 2,
      orderBusinessDate: '2026-09-10',
      businessDate: '2026-09-15',
      amount: '30.00',
      extra: '2.00',
      paymentMethodId: 2,
      createdAt: '2026-09-15T23:00:00Z',
    }),
  ],
};

function apiWithDebtors(): FakeApiClient {
  const api = new FakeApiClient();
  api.paymentMethods = [...api.paymentMethods, FIADO_METHOD];
  api.fiado.debtors = [MARIA, JOAO];
  api.fiado.statements = { 15: STATEMENT };
  return api;
}

async function openFiadoTab(api = apiWithDebtors()) {
  await renderCashier(api);
  await userEvent.click(screen.getByRole('tab', { name: /^Fiado/ }));
  return api;
}

async function openMaria(api = apiWithDebtors()) {
  await openFiadoTab(api);
  await userEvent.click(screen.getByRole('button', { name: /^Maria/ }));
  await screen.findByRole('heading', { name: 'Em aberto' });
  return api;
}

const statementPanel = () =>
  screen.getByRole('region', { name: 'Extrato de Maria' });

const paymentRow = (text: RegExp) =>
  within(statementPanel())
    .getAllByRole('listitem')
    .find((item) => text.test(item.textContent ?? '')) as HTMLElement;

describe('CashierPage: aba Fiado (2026-10-25)', () => {
  it('a aba conta quem deve; a lista tem o total e a previsão; a busca filtra por nome ou telefone', async () => {
    await renderCashier(apiWithDebtors());
    const tab = screen.getByRole('tab', { name: /^Fiado/ });
    expect(tab).toHaveTextContent('2');
    await userEvent.click(tab);
    const maria = screen.getByRole('button', { name: /^Maria/ });
    expect(maria).toHaveTextContent('R$ 47,00');
    expect(maria).toHaveTextContent('1 pedido');
    expect(maria).toHaveTextContent('atrasado desde 21/09');
    expect(screen.getByRole('button', { name: /^João/ })).toHaveTextContent(
      'pagar em 30/09',
    );
    await type('Buscar cliente', 'joao');
    expect(screen.queryByRole('button', { name: /^Maria/ })).toBeNull();
    await userEvent.clear(screen.getByLabelText('Buscar cliente'));
    await type('Buscar cliente', '9999-1');
    expect(screen.queryByRole('button', { name: /^João/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Maria/ })).toBeVisible();
  });

  it('o extrato mostra o que deve, os pedidos em aberto, os recebimentos (o estornado com o motivo) e os pagos', async () => {
    await openMaria();
    const panel = statementPanel();
    expect(panel).toHaveTextContent('Deve R$ 47,00');
    expect(panel).toHaveTextContent('#5 de dom 20/09');
    expect(paymentRow(/R\$ 10,00/)).toHaveTextContent(
      'Estornado: Valor errado',
    );
    expect(
      within(paymentRow(/R\$ 10,00/)).queryByRole('button', {
        name: 'Estornar',
      }),
    ).toBeNull();
    expect(paymentRow(/R\$ 30,00/)).toHaveTextContent('+ adicional R$ 2,00');
    expect(paymentRow(/R\$ 30,00/)).toHaveTextContent('Dinheiro');
    expect(within(panel).getByRole('heading', { name: 'Pagos' })).toBeVisible();
    expect(panel).toHaveTextContent('#2 de qui 10/09');
  });

  it('Receber no extrato grava e relê o extrato e quem deve', async () => {
    const api = await openMaria();
    await userEvent.click(
      within(statementPanel()).getByRole('button', { name: 'Receber' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Receber fiado: Maria' });
    await userEvent.click(within(dialog).getByLabelText('PIX'));
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Receber' }),
    );
    await waitFor(() =>
      expect(
        api.calls.filter((c) => c.path === '/fiado/orders/50/payments'),
      ).toHaveLength(1),
    );
    await waitFor(() =>
      expect(
        api.lines.filter((line) => line === 'GET /fiado/customers/15'),
      ).toHaveLength(2),
    );
    expect(api.lines.filter((line) => line === 'GET /fiado/open')).toHaveLength(
      2,
    );
  });

  it('Estornar dentro da trava pede só o motivo', async () => {
    const api = await openMaria();
    await userEvent.click(
      within(paymentRow(/R\$ 3,00/)).getByRole('button', { name: 'Estornar' }),
    );
    const dialog = screen.getByRole('dialog', { name: /^Estornar R\$ 3,00/ });
    expect(within(dialog).queryByLabelText('Senha do admin')).toBeNull();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Lançado errado' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Estornar' }),
    );
    await waitFor(() =>
      expect(
        api.calls.find((c) => c.path === '/fiado/payments/901/cancel')?.body,
      ).toEqual({ reason: 'Lançado errado' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Estornar fora da trava pede a senha do admin', async () => {
    const api = apiWithDebtors();
    api.fiado.cancelNeedsManager = true;
    api.fiado.statements = {
      15: {
        ...STATEMENT,
        payments: [payment({ createdAt: '2026-09-22T20:00:00Z' })],
      },
    };
    await openMaria(api);
    await userEvent.click(
      within(paymentRow(/R\$ 3,00/)).getByRole('button', { name: 'Estornar' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Motivo do estorno'),
      'Forma errada',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Senha do admin'),
      FAKE_ADMIN_PASSWORD,
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Estornar' }),
    );
    await waitFor(() =>
      expect(
        api.calls.find((c) => c.path === '/fiado/payments/901/cancel')?.body,
      ).toEqual({
        reason: 'Forma errada',
        managerPassword: FAKE_ADMIN_PASSWORD,
      }),
    );
  });

  it('Ver mostra o histórico do pedido de outra noite', async () => {
    const api = await openMaria();
    api.orderEvents = {
      50: [
        {
          id: 1,
          at: '2026-09-20T23:00:00Z',
          userRole: 'CAIXA',
          managerAuthorized: false,
          details: {
            kind: 'CREATED',
            order: {
              amount: '50.00',
              paymentMethodId: 7,
              paymentMode: null,
              items: '2× X Salada',
            },
          },
        },
      ],
    };
    await userEvent.click(
      within(statementPanel()).getByRole('button', {
        name: 'Ver o pedido #5 de dom 20/09',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '#5 de dom 20/09',
    });
    expect(
      await within(dialog).findByText(
        /Lançado: R\$ 50,00 · Fiado · 2× X Salada/,
      ),
    ).toBeVisible();
  });

  it('noite fechada: o extrato não tem Receber, Remarcar nem Estornar', async () => {
    const api = apiWithDebtors();
    api.closingStatus = 'CLOSED';
    await openMaria(api);
    const panel = statementPanel();
    expect(within(panel).queryByRole('button', { name: 'Receber' })).toBeNull();
    expect(
      within(panel).queryByRole('button', { name: 'Remarcar' }),
    ).toBeNull();
    expect(
      within(panel).queryByRole('button', { name: 'Estornar' }),
    ).toBeNull();
    await click('Ver o pedido #2 de qui 10/09');
    expect(await screen.findByRole('dialog')).toBeVisible();
  });
});
