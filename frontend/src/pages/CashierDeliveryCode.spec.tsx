import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Order } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeTextExport } from '../test-support/fake-stock-export';
import { orderFixture } from '../test-support/order-fixture';
import { renderCashier } from '../test-support/render-cashier';

/** Entrega #3 para o Colinas 1, bairro com o código ligado (pedido do usuário, 2026-11-21). */
function apiWithDelivery(fields: Partial<Order> = {}): FakeApiClient {
  const api = new FakeApiClient();
  api.settings.deliveryCodeConfirmMessage = 'Confirmado! Código: *[CÓDIGO]*';
  api.settings.deliveryCodeRouteMessage = 'Saiu! Tenha o [CÓDIGO] em mãos.';
  api.orders = [
    orderFixture({
      id: 3,
      dayNumber: 3,
      type: 'DELIVERY',
      customerId: 5,
      customerName: 'Ana',
      customerStreet: 'Rua A',
      customerNumber: '123',
      deliveryCode: '4827',
      ...fields,
    }),
  ];
  return api;
}

async function openOrder(
  api: FakeApiClient,
  textExport = new FakeTextExport(),
) {
  await renderCashier(api, undefined, textExport);
  // O cancelado só aparece no filtro Cancelados.
  if (api.orders[0].canceledAt !== null)
    await userEvent.click(
      await screen.findByRole('button', { name: /Cancelados/ }),
    );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Ver pedido #3' }),
  );
  return within(screen.getByRole('dialog', { name: /^#3/ }));
}

describe('CashierPage: código de entrega no pop-up do pedido', () => {
  it('mostra os 4 dígitos', async () => {
    const dialog = await openOrder(apiWithDelivery());
    const panel = within(
      dialog.getByRole('region', { name: 'Código de entrega' }),
    );
    expect(panel.getByText('4827')).toBeInTheDocument();
  });

  it('as duas teclas copiam a mensagem com o código no lugar de [CÓDIGO]', async () => {
    const textExport = new FakeTextExport();
    const dialog = await openOrder(apiWithDelivery(), textExport);
    await userEvent.click(
      dialog.getByRole('button', { name: 'Copiar confirmação' }),
    );
    await userEvent.click(
      dialog.getByRole('button', { name: 'Copiar saiu p/ entrega' }),
    );
    expect(textExport.copied).toEqual([
      'Confirmado! Código: *4827*',
      'Saiu! Tenha o 4827 em mãos.',
    ]);
    expect(dialog.getByRole('status')).toHaveTextContent('Mensagem copiada');
  });

  it('se o navegador não deixa copiar, avisa', async () => {
    const textExport = new FakeTextExport();
    textExport.copyWorks = false;
    const dialog = await openOrder(apiWithDelivery(), textExport);
    await userEvent.click(
      dialog.getByRole('button', { name: 'Copiar confirmação' }),
    );
    expect(dialog.getByRole('status')).toHaveTextContent(
      'O navegador não deixou copiar',
    );
  });

  it('o pop-up não mostra o telefone, que saiu em 2026-11-21', async () => {
    const dialog = await openOrder(
      apiWithDelivery({ customerPhone: '79999991234' }),
    );
    expect(dialog.queryByText('Telefone')).toBeNull();
    expect(dialog.queryByText('79999991234')).toBeNull();
    expect(dialog.getByText('Rua A, 123')).toBeInTheDocument();
  });

  it('pedido sem código não mostra nada', async () => {
    const dialog = await openOrder(apiWithDelivery({ deliveryCode: null }));
    expect(
      dialog.queryByRole('region', { name: 'Código de entrega' }),
    ).toBeNull();
    expect(
      dialog.queryByRole('button', { name: 'Copiar confirmação' }),
    ).toBeNull();
  });

  it('pedido cancelado não mostra o código', async () => {
    const dialog = await openOrder(
      apiWithDelivery({
        canceledAt: '2026-09-22T23:50:00Z',
        cancelReason: 'Cliente desistiu',
      }),
    );
    expect(dialog.queryByText('4827')).toBeNull();
  });
});
