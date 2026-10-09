import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { renderCashier, type } from '../test-support/render-cashier';

const resident = (id: number, deliveryZoneId: number): Customer => ({
  id,
  name: `Cliente ${id}`,
  phone: null,
  street: 'Rua Camomila',
  number: String(id),
  reference: null,
  deliveryZoneId,
});

/** Rua Camomila tem 2 clientes no Pousada do Vale e 1 no Monterrey. */
function apiWithCamomila(): FakeApiClient {
  const api = new FakeApiClient();
  api.zones.push({
    id: 2,
    neighborhood: 'Pousada do Vale',
    neighborhoodKey: 'pousada do vale',
    fee: '4.00',
    active: true,
  });
  api.customers = [resident(7, 2), resident(8, 2), resident(9, 1)];
  return api;
}

describe('CashierPage: bairro pela rua', () => {
  it('cliente novo numa rua conhecida ganha o bairro e a taxa ao sair da Rua', async () => {
    const api = await renderCashier(apiWithCamomila());
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Nome do cliente', 'Carla');
    await type('Rua', 'r. camomila');
    await userEvent.tab();
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Camomila');
    await waitFor(() =>
      expect(screen.getByLabelText('Bairro')).toHaveValue('Pousada do Vale'),
    );
    expect(screen.getByLabelText('Taxa de entrega')).toHaveValue('4,00');
    expect(api.lines).toContain('GET /customers/street-zones');
  });

  it('bairro já digitado pelo caixa não muda', async () => {
    await renderCashier(apiWithCamomila());
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await type('Rua', 'Rua Camomila');
    await userEvent.tab();
    expect(screen.getByLabelText('Bairro')).toHaveValue('Monterrey');
  });
});
