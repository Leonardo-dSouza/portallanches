import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  addOrderByKeyboard,
  click,
  renderCashier,
} from '../test-support/render-cashier';

/** Abre a janela de cancelar da 1ª linha da lista. */
async function openCancel(): Promise<HTMLElement> {
  await userEvent.click(
    (await screen.findAllByRole('button', { name: 'Cancelar pedido' }))[0],
  );
  return screen.getByRole('dialog');
}

const confirmCancel = (dialog: HTMLElement) =>
  userEvent.click(
    within(dialog).getByRole('button', { name: 'Cancelar pedido' }),
  );

async function cashierWithOneOrder(api = new FakeApiClient()) {
  await renderCashier(api);
  await addOrderByKeyboard('9{Enter}');
  await screen.findByText('R$ 17,80');
  return api;
}

/** O pedido do fake é lançado às 23:41 UTC; 4 min depois ainda está na trava do caixa. */
const INSIDE_LOCK = new Date('2026-09-22T23:45:00Z');
const OUTSIDE_LOCK = new Date('2026-09-23T00:05:00Z');

describe('CashierPage: cancelar no lugar de apagar (2026-10-15)', () => {
  // Só a data é falsa: os temporizadores do user-event continuam de verdade.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(INSIDE_LOCK);
  });
  afterEach(() => vi.useRealTimers());

  it('motivo obrigatório; cancelado sai de Todos e fica em Cancelados, riscado, com o motivo', async () => {
    const api = await cashierWithOneOrder();
    const dialog = await openCancel();
    // Dentro da trava: sem o campo da senha do admin.
    expect(within(dialog).queryByLabelText('Senha do admin')).toBeNull();
    await confirmCancel(dialog);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Escreva o motivo',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Motivo do cancelamento'),
      'Cliente foi embora',
    );
    await confirmCancel(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/orders/100/cancel',
      body: { reason: 'Cliente foi embora' },
    });
    expect(
      await screen.findByText('Nenhum pedido neste filtro.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Cancelados/ }));
    expect(screen.getByText('Motivo: Cliente foi embora')).toBeVisible();
    expect(screen.getByText('Cancelado')).toBeVisible();
    // O caixa não desfaz: só o admin.
    expect(
      screen.queryByRole('button', { name: /Desfazer cancelamento/ }),
    ).toBeNull();
  });

  it('fora da trava a janela já pede a senha do admin; errada avisa, certa cancela', async () => {
    const api = new FakeApiClient();
    api.cancelNeedsManager = true;
    await cashierWithOneOrder(api);
    vi.setSystemTime(OUTSIDE_LOCK);
    const dialog = await openCancel();
    await click('Pedido duplicado');
    await userEvent.type(within(dialog).getByLabelText('Senha do admin'), 'x');
    await confirmCancel(dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Senha do admin errada',
    );
    const password = within(dialog).getByLabelText('Senha do admin');
    await userEvent.clear(password);
    await userEvent.type(password, 'admin123');
    await confirmCancel(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/orders/100/cancel',
      body: { reason: 'Pedido duplicado', managerPassword: 'admin123' },
    });
  });

  it('o admin desfaz o cancelamento pela linha', async () => {
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    await cashierWithOneOrder(api);
    const dialog = await openCancel();
    await click('Cliente desistiu');
    await confirmCancel(dialog);
    await userEvent.click(
      await screen.findByRole('button', { name: /Cancelados/ }),
    );
    await click('Desfazer cancelamento do #1');
    await waitFor(() =>
      expect(api.lines).toContain('POST /orders/100/restore'),
    );
    await userEvent.click(screen.getByRole('button', { name: /Todos/ }));
    expect(await screen.findByText('R$ 17,80')).toBeVisible();
  });

  it('o relatório tira o cancelado do total e mostra à parte', async () => {
    await cashierWithOneOrder();
    const dialog = await openCancel();
    await click('Cliente desistiu');
    await confirmCancel(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await userEvent.click(screen.getByRole('tab', { name: /Relatório/ }));
    expect(
      await screen.findByText('Cancelados (1), fora do total'),
    ).toBeVisible();
    expect(screen.getByText('Pedidos (0)')).toBeVisible();
  });

  it('o pop-up do pedido mostra o histórico', async () => {
    const api = new FakeApiClient();
    api.orderEvents[100] = [
      {
        id: 1,
        at: '2026-09-22T23:41:00Z',
        userRole: 'CAIXA',
        managerAuthorized: false,
        details: {
          kind: 'CREATED',
          order: {
            amount: '17.80',
            paymentMethodId: 1,
            paymentMode: null,
            items: '1× X Salada',
          },
        },
      },
    ];
    await cashierWithOneOrder(api);
    await click('Ver pedido #1');
    const history = await screen.findByRole('region', {
      name: 'Histórico do pedido',
    });
    expect(history).toHaveTextContent(
      'Lançado: R$ 17,80 · PIX · 1× X Salada (caixa)',
    );
  });
});
