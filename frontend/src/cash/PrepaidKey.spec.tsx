import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PaymentMethod } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { renderCashier } from '../test-support/render-cashier';

const TON: PaymentMethod = {
  id: 3,
  name: 'Cartão Ton',
  active: true,
  sortOrder: 2,
  isCardTerminal: true,
  isCash: false,
  isFiado: false,
  isIfood: false,
};

async function setupDeliveryCashier() {
  const api = new FakeApiClient();
  api.paymentMethods = [...api.paymentMethods, TON];
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  await userEvent.click(screen.getByRole('radio', { name: 'Entrega' }));
  return api;
}

describe('PrepaidKey', () => {
  it('no balcão a tecla não aparece', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = [...api.paymentMethods, TON];
    await renderCashier(api);
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    expect(
      screen.queryByRole('button', { name: 'PAGO' }),
    ).not.toBeInTheDocument();
  });

  it('na entrega: PIX deixa PAGO ligado, Ton desligado, clicar alterna e Dinheiro+PAGO esconde troco', async () => {
    await setupDeliveryCashier();
    await userEvent.click(screen.getByRole('radio', { name: /PIX/ }));
    const pagoKey = screen.getByRole('button', { name: 'PAGO' });
    expect(pagoKey).toBeInTheDocument();
    expect(pagoKey).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('radio', { name: /Cartão Ton/ }));
    expect(pagoKey).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(pagoKey);
    expect(pagoKey).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pagoKey);
    expect(pagoKey).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('radio', { name: /Dinheiro/ }));
    expect(screen.getByLabelText('Troco para')).toBeInTheDocument();

    await userEvent.click(pagoKey);
    expect(pagoKey).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Troco para')).not.toBeInTheDocument();
  });
});
