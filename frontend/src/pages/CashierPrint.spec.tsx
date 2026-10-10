import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeReceiptPrinter } from '../test-support/fake-receipt-printer';
import { storedItem, storedLine } from '../test-support/order-menu';
import { orderFixture } from '../test-support/order-fixture';
import {
  addOrderByKeyboard,
  renderCashier,
} from '../test-support/render-cashier';

const AUTO_PRINT_KEY = 'portallanches.caixa.imprimir-ao-salvar';

function apiWithOrder(): FakeApiClient {
  const api = new FakeApiClient();
  api.orders = [
    orderFixture({
      id: 7,
      dayNumber: 7,
      items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
    }),
  ];
  return api;
}

describe('CashierPage: comanda impressa (2026-10-10)', () => {
  beforeEach(() => localStorage.clear());

  it('com "Imprimir ao salvar" ligado neste PC, o pedido novo sai inteiro', async () => {
    localStorage.setItem(AUTO_PRINT_KEY, 'sim');
    const printer = new FakeReceiptPrinter();
    await renderCashier(new FakeApiClient(), printer);
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    expect(printer.printed.map((r) => [r.kind, r.number])).toEqual([
      ['full', '#1'],
    ]);
  });

  it('desligado (o padrão de um PC novo), salvar não imprime; o interruptor lembra', async () => {
    const printer = new FakeReceiptPrinter();
    await renderCashier(new FakeApiClient(), printer);
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    expect(printer.printed).toEqual([]);
    await userEvent.click(
      screen.getByRole('switch', { name: 'Imprimir a comanda ao salvar' }),
    );
    expect(localStorage.getItem(AUTO_PRINT_KEY)).toBe('sim');
  });

  it('editar acrescentando um item imprime a ADIÇÃO só com ele', async () => {
    localStorage.setItem(AUTO_PRINT_KEY, 'sim');
    const printer = new FakeReceiptPrinter();
    await renderCashier(apiWithOrder(), printer);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 6{Enter}');
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar alterações/ }),
    );
    await screen.findByText('1× Coca Cola 600ml');
    expect(printer.printed).toHaveLength(1);
    expect(printer.printed[0].kind).toBe('addition');
    expect(printer.printed[0].rows.map((row) => row.name)).toEqual([
      'Coca Cola 600ml',
    ]);
  });

  it('caixa atrasado não imprime sozinho', async () => {
    localStorage.setItem(AUTO_PRINT_KEY, 'sim');
    const api = new FakeApiClient();
    api.liveOrders = false;
    const printer = new FakeReceiptPrinter();
    await renderCashier(api, printer);
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    expect(printer.printed).toEqual([]);
  });

  it('Reimprimir (na linha e no pop-up) sai inteiro, mesmo desligado', async () => {
    const printer = new FakeReceiptPrinter();
    await renderCashier(apiWithOrder(), printer);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reimprimir' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver pedido #7' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Reimprimir',
      }),
    );
    expect(printer.printed.map((r) => [r.kind, r.number])).toEqual([
      ['full', '#7'],
      ['full', '#7'],
    ]);
  });
});
