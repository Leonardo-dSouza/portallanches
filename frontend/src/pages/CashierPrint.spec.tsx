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
      screen.getByRole('switch', { name: 'Imprimir ao salvar' }),
    );
    expect(localStorage.getItem(AUTO_PRINT_KEY)).toBe('sim');
  });

  it('editar acrescentando um item imprime a comanda inteira com ALTERADO (2026-10-15)', async () => {
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
    expect(printer.printed[0].kind).toBe('changed');
    expect(
      printer.printed[0].items.map((item) => [item.title, item.newMark]),
    ).toEqual([
      ['1 X Salada', undefined],
      ['1 Coca Cola 600ml', 'NOVO'],
    ]);
  });

  it('a comanda sai com a marca e as abreviações de Cadastros → Comanda', async () => {
    const api = apiWithOrder();
    api.orders[0].items = [
      storedItem(storedLine('X Salada', 'Artesanal', 1, '25.90', 9)),
      storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 2, '7.00')),
    ];
    api.settings = {
      ...api.settings,
      artisanalMark: '(art)',
      ticketAbbreviations: [{ from: 'Coca Cola', to: 'Coca' }],
    };
    const printer = new FakeReceiptPrinter();
    await renderCashier(api, printer);
    // A tela mostra a marca configurada; o nome abreviado é só do papel.
    expect(await screen.findByText('1× X Salada (art)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reimprimir' }));
    expect(printer.printed[0].items.map((item) => item.title)).toEqual([
      '1 X Salada (art)',
      '2 Coca 600ml',
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
