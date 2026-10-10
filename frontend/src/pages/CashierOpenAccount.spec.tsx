import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { storedItem, storedLine } from '../test-support/order-menu';
import { orderFixture } from '../test-support/order-fixture';
import {
  fillCustomer,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

const waitForQtd = () =>
  waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());

describe('CashierPage: conta aberta e nome no balcão (2026-10-10)', () => {
  it('tecla 0 deixa aberto: o foco vai ao Nome e o Enter salva', async () => {
    const api = await renderCashier();
    await waitForQtd();
    await userEvent.keyboard('{Enter}9{Enter}{Enter}{Enter}0');
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    await userEvent.keyboard('Maria{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: [{ productId: 1, quantity: 1 }],
        type: 'COUNTER',
        paymentMethodId: null,
        counterName: 'Maria',
      },
    ]);
  });

  it('aberto sem nome avisa e não grava', async () => {
    const api = await renderCashier();
    await waitForQtd();
    await userEvent.keyboard('{Enter}9{Enter}{Enter}{Enter}0{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Conta aberta precisa do nome',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('balcão pago também leva o nome digitado', async () => {
    const api = await renderCashier();
    await type('Nome', 'João');
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}{Enter}{Enter}1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ paymentMethodId: 1, counterName: 'João' }),
    ]);
  });

  it('receber a conta aberta: editar, escolher a forma e salvar', async () => {
    const api = new FakeApiClient();
    api.orders = [
      orderFixture({
        id: 7,
        paymentMethodId: null,
        customerName: 'Maria',
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
      }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );
    expect(screen.getByLabelText('Aberto')).toBeChecked();
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria');
    await userEvent.click(screen.getByLabelText('PIX'));
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar alterações/ }),
    );
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({
      paymentMethodId: 1,
      counterName: 'Maria',
    });
  });

  it('a entrega não tem a tecla Aberto nem o campo Nome do balcão', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    expect(screen.queryByLabelText('Aberto')).toBeNull();
    expect(screen.queryByLabelText('Nome')).toBeNull();
  });
});

describe('CashierPage: "Troco para" na entrega em dinheiro', () => {
  it('escolher Dinheiro na entrega leva ao Troco; Enter salva com o troco', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await fillCustomer('Ana', 'Rua A');
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}{Enter}{Enter}2');
    expect(screen.getByLabelText('Troco para')).toHaveFocus();
    await userEvent.keyboard('100{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ paymentMethodId: 2, changeFor: '100.00' }),
    ]);
  });

  it('o Troco só aparece com Dinheiro e some ao trocar a forma', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await userEvent.click(screen.getByLabelText('Dinheiro'));
    await type('Troco para', '50');
    await userEvent.click(screen.getByLabelText('PIX'));
    expect(screen.queryByLabelText('Troco para')).toBeNull();
    await userEvent.click(screen.getByLabelText('Dinheiro'));
    expect(screen.getByLabelText('Troco para')).toHaveValue('');
    expect(
      within(screen.getByRole('group', { name: 'Pagamento' })).queryByLabelText(
        'Aberto',
      ),
    ).toBeNull();
  });
});
