import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/api-client';
import type { FiadoDueOrder, OrderFiado } from '../api/fiado-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import { orderFixture } from '../test-support/order-fixture';
import { pickDate } from '../test-support/pick-date';
import { click, renderCashier } from '../test-support/render-cashier';

/** Fiado da Maria de domingo (20/09), previsto para segunda: atrasado na terça dos testes. */
const MARIA_DUE: FiadoDueOrder = {
  orderId: 50,
  businessDate: '2026-09-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '50.00',
  paidTotal: '3.00',
  remaining: '47.00',
  dueDate: '2026-09-21',
  customerId: 15,
  customerName: 'Maria',
  customerPhone: null,
};

const FIADO: OrderFiado = {
  dueDate: null,
  paidTotal: '0.00',
  remaining: '17.80',
  customerOpenTotal: '17.80',
};

function apiWithDue(due: FiadoDueOrder[] = [MARIA_DUE]): FakeApiClient {
  const api = new FakeApiClient();
  api.paymentMethods = [...api.paymentMethods, FIADO_METHOD];
  api.fiado.due = due;
  return api;
}

const dueRow = () =>
  screen.getByRole('row', { name: /Fiado de dom 20\/09/ }) as HTMLElement;

const filterKey = (label: string) =>
  within(screen.getByRole('group', { name: 'Filtrar pedidos' })).getByRole(
    'button',
    { name: new RegExp(`^${label}`) },
  );

/** O salvar da janela, que tem o mesmo nome da tecla que a abriu (2026-10-27). */
const saveNewDate = () =>
  userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Reagendar pagamento',
    }),
  );

const posts = (api: FakeApiClient, path: string) =>
  api.calls.filter((c) => c.path === path).map((c) => c.body);

describe('CashierPage: fiados do dia na lista (2026-10-25)', () => {
  it('as teclas do fiado do topo têm nome e ficam na célula larga, não nas ações (2026-10-27)', async () => {
    await renderCashier(apiWithDue());
    const row = await screen.findByRole('row', { name: /Fiado de dom 20\/09/ });
    const receive = within(row).getByRole('button', {
      name: 'Receber pagamento',
    });
    expect(receive).toHaveTextContent('Receber pagamento');
    expect(receive.closest('td')).toHaveClass('fiado-due-note');
    expect(
      within(row).getByRole('button', { name: 'Reagendar pagamento' }),
    ).toHaveTextContent('Reagendar pagamento');
  });

  it('o fiado de outra noite aparece no topo, mesmo sem pedido na noite, e conta no A pagar', async () => {
    await renderCashier(apiWithDue());
    const row = await screen.findByRole('row', { name: /Fiado de dom 20\/09/ });
    expect(row).toHaveTextContent('#5');
    expect(row).toHaveTextContent('Maria');
    expect(row).toHaveTextContent('previsto 21/09, atrasado');
    expect(row).toHaveTextContent('falta R$ 47,00');
    expect(filterKey('A pagar')).toHaveTextContent('1');
    await userEvent.click(filterKey('A pagar'));
    expect(dueRow()).toBeVisible();
    await userEvent.click(filterKey('Balcão'));
    expect(
      screen.queryByRole('row', { name: /Fiado de dom 20\/09/ }),
    ).toBeNull();
  });

  it('Receber: Valor vem com o que falta; Enter anda até a forma e salva com o adicional', async () => {
    const api = await renderCashier(apiWithDue());
    await userEvent.click(
      within(
        await screen.findByRole('row', { name: /Fiado de dom/ }),
      ).getByRole('button', { name: 'Receber pagamento' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Receber pagamento: Maria',
    });
    expect(dialog).toHaveTextContent('falta R$ 47,00');
    const amount = within(dialog).getByLabelText('Valor');
    expect(amount).toHaveValue('47,00');
    await waitFor(() => expect(amount).toHaveFocus());
    await userEvent.clear(amount);
    await userEvent.keyboard('20{Enter}');
    expect(within(dialog).getByLabelText('Adicional (juros)')).toHaveFocus();
    await userEvent.keyboard('5{Enter}1{Enter}');
    await waitFor(() =>
      expect(posts(api, '/fiado/orders/50/payments')).toEqual([
        { amount: '20.00', extra: '5.00', paymentMethodId: 1 },
      ]),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.lines.filter((line) => line === 'GET /fiado/due')).toHaveLength(
      2,
    );
  });

  it('Receber: as teclas não têm a forma fiado; a recusa da API aparece na janela', async () => {
    const api = apiWithDue();
    api.fiado.refusal = new ApiError(
      422,
      'Valor 60.00 maior que o que falta no pedido #5 (47.00)',
    );
    await renderCashier(api);
    await userEvent.click(
      within(
        await screen.findByRole('row', { name: /Fiado de dom/ }),
      ).getByRole('button', { name: 'Receber pagamento' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Fiado')).toBeNull();
    expect(within(dialog).queryByLabelText('A pagar')).toBeNull();
    await userEvent.click(within(dialog).getByLabelText('PIX'));
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Receber pagamento' }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'maior que o que falta',
    );
  });

  it('Remarcar: escolhe a data nova ou "Sem data"', async () => {
    const api = await renderCashier(apiWithDue());
    await userEvent.click(
      within(
        await screen.findByRole('row', { name: /Fiado de dom/ }),
      ).getByRole('button', { name: 'Reagendar pagamento' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Reagendar pagamento: Maria' }),
    ).toBeVisible();
    await pickDate('Pagar em', '2026-09-25');
    await saveNewDate();
    await waitFor(() =>
      expect(posts(api, '/fiado/orders/50/due-date')).toEqual([
        { dueDate: '2026-09-25' },
      ]),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(
      within(dueRow()).getByRole('button', { name: 'Reagendar pagamento' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /^Pagar em/ }));
    await click('Sem data');
    await saveNewDate();
    await waitFor(() =>
      expect(posts(api, '/fiado/orders/50/due-date')).toEqual([
        { dueDate: '2026-09-25' },
        { dueDate: null },
      ]),
    );
  });

  it('a janela do fiado da noite tem Receber pagamento e Reagendar pagamento (2026-10-27)', async () => {
    const api = apiWithDue([]);
    api.orders = [
      orderFixture({
        id: 7,
        dayNumber: 1,
        paymentMethodId: 7,
        customerName: 'Ana',
        fiado: { ...FIADO, dueDate: '2026-09-30' },
      }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver pedido #1' }),
    );
    const dialog = screen.getByRole('dialog', { name: '#1 Balcão: Ana' });
    expect(
      within(dialog).getByRole('button', { name: 'Receber pagamento' }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reagendar pagamento' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Reagendar pagamento: Ana' }),
    ).toBeVisible();
  });

  it('o fiado da noite mostra a situação embaixo do nome e tem o Receber na linha', async () => {
    const api = apiWithDue([]);
    api.orders = [
      orderFixture({
        id: 7,
        dayNumber: 1,
        paymentMethodId: 7,
        customerName: 'Ana',
        fiado: { ...FIADO, dueDate: '2026-09-30' },
      }),
      orderFixture({
        id: 8,
        dayNumber: 2,
        paymentMethodId: 7,
        customerName: 'Bia',
        fiado: { ...FIADO, paidTotal: '0.80', remaining: '17.00' },
      }),
      orderFixture({
        id: 9,
        dayNumber: 3,
        paymentMethodId: 7,
        customerName: 'Caio',
        fiado: { ...FIADO, paidTotal: '17.80', remaining: '0.00' },
      }),
    ];
    await renderCashier(api);
    const rowOf = (name: string) =>
      screen.getByRole('row', { name: new RegExp(name) }) as HTMLElement;
    await screen.findByText('Ana');
    expect(rowOf('Ana')).toHaveTextContent('Fiado pagar em 30/09');
    expect(rowOf('Bia')).toHaveTextContent('Fiado falta R$ 17,00');
    expect(rowOf('Caio')).toHaveTextContent('Fiado pago');
    expect(
      within(rowOf('Caio')).queryByRole('button', {
        name: 'Receber pagamento',
      }),
    ).toBeNull();
    expect(filterKey('A pagar')).toHaveTextContent('0');
    // Sob o valor, não nas ações: a 4ª tecla lá espremia o cliente em 1366 px (2026-10-27).
    const receive = within(rowOf('Bia')).getByRole('button', {
      name: 'Receber pagamento',
    });
    expect(receive.closest('td')).toHaveClass('num');
    await userEvent.click(receive);
    const amount = within(screen.getByRole('dialog')).getByLabelText('Valor');
    expect(amount).toHaveValue('17,00');
  });
});
