import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { pickDate } from '../test-support/pick-date';
import {
  click,
  fillCustomer,
  ONE_X_SALADA,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

const PHONE = '79999991234';

const counterCustomer = (fields: Partial<Customer> = {}): Customer => ({
  id: 15,
  name: 'Maria',
  phone: PHONE,
  street: null,
  number: null,
  reference: null,
  deliveryZoneId: null,
  ...fields,
});

function apiWithFiado(): FakeApiClient {
  const api = new FakeApiClient();
  api.paymentMethods = [...api.paymentMethods, FIADO_METHOD];
  return api;
}

const waitForQtd = () =>
  waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());

/** Um X Salada pelo teclado e a tecla 3 (a forma Fiado, depois de PIX e Dinheiro). */
async function chooseFiadoByKeyboard() {
  await waitForQtd();
  await userEvent.keyboard('{Enter}9{Enter}{Enter}{Enter}3');
}

const saveOrder = () => click('Salvar pedido');

describe('CashierPage: fiado na comanda (2026-10-25)', () => {
  it('balcão: a tecla Fiado leva ao Telefone; cliente novo vai só com nome e telefone, e o "Pagar em" junto', async () => {
    const api = await renderCashier(apiWithFiado());
    await chooseFiadoByKeyboard();
    expect(screen.getByLabelText('Telefone')).toHaveFocus();
    await userEvent.keyboard(`${PHONE}{Enter}`);
    expect(screen.getByLabelText('Nome do cliente')).toHaveFocus();
    await userEvent.keyboard('Maria');
    await pickDate('Pagar em', '2026-09-25');
    await saveOrder();
    expect(postedBodies(api, '/customers')).toEqual([
      {
        name: 'Maria',
        phone: PHONE,
        street: null,
        number: null,
        reference: null,
        deliveryZoneId: null,
      },
    ]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: ONE_X_SALADA,
        type: 'COUNTER',
        paymentMethodId: 7,
        customerId: 100,
        fiadoDueDate: '2026-09-25',
      },
    ]);
  });

  it('sem cliente avisa e não grava', async () => {
    const api = await renderCashier(apiWithFiado());
    await chooseFiadoByKeyboard();
    await saveOrder();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fiado precisa do cliente: digite o telefone ou o nome',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('cliente achado pelo telefone mostra quanto já deve e não regrava o cadastro', async () => {
    const api = apiWithFiado();
    api.customers = [counterCustomer()];
    api.fiado.debtors = [
      {
        customerId: 15,
        name: 'Maria',
        phone: PHONE,
        openTotal: '30.00',
        orders: [],
      },
    ];
    await renderCashier(api);
    await chooseFiadoByKeyboard();
    await userEvent.keyboard(`${PHONE}{Enter}`);
    expect(await screen.findByText('Já deve R$ 30,00 no fiado.')).toBeVisible();
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Maria');
    await saveOrder();
    expect(postedBodies(api, '/customers')).toEqual([]);
    expect(api.calls.filter((c) => c.method === 'PUT')).toEqual([]);
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: 15 }),
    ]);
    expect(postedBodies(api, '/orders')[0]).not.toHaveProperty('fiadoDueDate');
  });

  it('cliente da entrega achado no balcão: trocar o nome atualiza o cadastro sem perder o endereço', async () => {
    const api = apiWithFiado();
    api.customers = [
      counterCustomer({
        id: 16,
        street: 'Rua A',
        number: '12',
        reference: 'Casa azul',
        deliveryZoneId: 1,
      }),
    ];
    await renderCashier(api);
    await chooseFiadoByKeyboard();
    await userEvent.keyboard(`${PHONE}{Enter}`);
    await waitFor(() =>
      expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Maria'),
    );
    await userEvent.keyboard(' Silva');
    await saveOrder();
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put).toEqual({
      method: 'PUT',
      path: '/customers/16',
      body: {
        name: 'Maria Silva',
        phone: PHONE,
        street: 'Rua A',
        number: '12',
        reference: 'Casa azul',
        deliveryZoneId: 1,
      },
    });
  });

  it('Enter no Nome do cliente salva, achando antes o cadastro pelo nome', async () => {
    const api = apiWithFiado();
    api.customers = [counterCustomer({ phone: null })];
    await renderCashier(api);
    await chooseFiadoByKeyboard();
    await userEvent.click(screen.getByLabelText('Nome do cliente'));
    await userEvent.keyboard('maria{Enter}');
    await waitFor(() =>
      expect(postedBodies(api, '/orders')).toEqual([
        expect.objectContaining({ customerId: 15, paymentMethodId: 7 }),
      ]),
    );
    expect(postedBodies(api, '/customers')).toEqual([]);
  });

  it('homônimos no Enter: mostra a lista para escolher e não grava', async () => {
    const api = apiWithFiado();
    api.customers = [
      counterCustomer({ phone: null }),
      counterCustomer({ id: 16, phone: '79988887777' }),
    ];
    await renderCashier(api);
    await chooseFiadoByKeyboard();
    await userEvent.click(screen.getByLabelText('Nome do cliente'));
    await userEvent.keyboard('Maria{Enter}');
    expect(
      await screen.findByText(/2 clientes com esse nome/),
    ).toBeInTheDocument();
    expect(postedBodies(api, '/orders')).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /79988887777/ }));
    await saveOrder();
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: 16 }),
    ]);
  });

  it('o nome digitado no balcão antes vira o nome do cliente do fiado', async () => {
    await renderCashier(apiWithFiado());
    await type('Nome', 'João');
    await userEvent.click(screen.getByLabelText('Fiado'));
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('João');
    expect(screen.queryByLabelText('Nome')).toBeNull();
  });

  it('entrega fiado: o cliente é o da entrega e o "Pagar em" vai junto', async () => {
    const api = await renderCashier(apiWithFiado());
    await userEvent.click(screen.getByLabelText('Entrega'));
    await fillCustomer('Ana', 'Rua B');
    await type('Bairro', 'Monterrey');
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}{Enter}');
    await userEvent.click(screen.getByLabelText('Fiado'));
    expect(screen.getAllByLabelText('Telefone')).toHaveLength(1);
    await pickDate('Pagar em', '2026-09-30');
    await saveOrder();
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({
        type: 'DELIVERY',
        paymentMethodId: 7,
        fiadoDueDate: '2026-09-30',
      }),
    ]);
  });

  it('editar o fiado do balcão e trocar o nome não apaga o endereço do cadastro', async () => {
    const api = apiWithFiado();
    api.customers = [
      counterCustomer({ street: 'Rua A', number: '12', deliveryZoneId: 1 }),
    ];
    api.orders = [
      orderFixture({
        id: 7,
        paymentMethodId: 7,
        customerId: 15,
        customerName: 'Maria',
        customerPhone: PHONE,
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
      }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );
    await type('Nome do cliente', ' Souza');
    await click('Salvar alterações');
    expect(api.calls.find((c) => c.path === '/customers/15')?.body).toEqual({
      name: 'Maria Souza',
      phone: PHONE,
      street: 'Rua A',
      number: '12',
      reference: null,
      deliveryZoneId: 1,
    });
  });

  it('editar o fiado do balcão abre com o cliente, a previsão e o que ele deve com este pedido', async () => {
    const api = apiWithFiado();
    api.orders = [
      orderFixture({
        id: 7,
        paymentMethodId: 7,
        customerId: 15,
        customerName: 'Maria',
        customerPhone: PHONE,
        fiadoDueDate: '2026-09-25',
        fiado: {
          dueDate: '2026-09-25',
          paidTotal: '0.00',
          remaining: '17.80',
          customerOpenTotal: '47.80',
        },
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
      }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );
    expect(screen.getByLabelText('Fiado')).toBeChecked();
    expect(screen.getByLabelText('Telefone')).toHaveValue(PHONE);
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Maria');
    expect(
      screen.getByRole('button', { name: /^Pagar em/ }),
    ).toHaveAccessibleName('Pagar em sex, 25/09/2026');
    expect(
      screen.getByText('Deve R$ 47,80 no fiado, com este pedido.'),
    ).toBeVisible();
    await click('Salvar alterações');
    expect(api.calls.find((c) => c.path === '/orders/7')?.body).toEqual({
      items: ONE_X_SALADA,
      type: 'COUNTER',
      paymentMethodId: 7,
      customerId: 15,
      fiadoDueDate: '2026-09-25',
    });
    expect(api.calls.filter((c) => c.path.startsWith('/customers/'))).toEqual(
      [],
    );
  });
});
