import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  addOrderByKeyboard,
  fillCustomer,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

/**
 * O caixa liga ou desliga o código em cada entrega; o bairro só dá o padrão (2026-11-21: a
 * Pousada do Vale mistura condomínio e casa).
 */
function apiWithZones(): FakeApiClient {
  const api = new FakeApiClient();
  const zone = (id: number, neighborhood: string, withCode: boolean) => ({
    id,
    neighborhood,
    neighborhoodKey: neighborhood.toLowerCase(),
    fee: '5.00',
    active: true,
    requiresDeliveryCode: withCode,
  });
  api.zones = [zone(2, 'Colinas 1', true), zone(3, 'Pousada do Vale', false)];
  return api;
}

const codeSwitch = () =>
  screen.getByRole('switch', { name: 'Código de entrega' });

async function startDelivery(api: FakeApiClient, neighborhood: string) {
  await renderCashier(api);
  await userEvent.click(screen.getByLabelText('Entrega'));
  await type('Bairro', neighborhood);
}

const orderedWith = (requiresDeliveryCode: boolean) => [
  expect.objectContaining({ requiresDeliveryCode }),
];

describe('CashierPage: código de entrega no pedido', () => {
  it('vem do bairro e volta ao padrão quando o bairro muda', async () => {
    await startDelivery(apiWithZones(), 'Colinas 1');
    expect(codeSwitch()).toBeChecked();
    await userEvent.clear(screen.getByLabelText('Bairro'));
    await type('Bairro', 'Pousada do Vale');
    expect(codeSwitch()).not.toBeChecked();
  });

  it('bairro com código: o caixa desliga e o pedido vai sem', async () => {
    const api = apiWithZones();
    await startDelivery(api, 'Colinas 1');
    await userEvent.click(codeSwitch());
    await fillCustomer('Bia', 'Rua B');
    await addOrderByKeyboard();
    expect(postedBodies(api, '/orders')).toEqual(orderedWith(false));
  });

  it('condomínio na Pousada do Vale: o caixa liga e o pedido vai com', async () => {
    const api = apiWithZones();
    await startDelivery(api, 'Pousada do Vale');
    await userEvent.click(codeSwitch());
    await fillCustomer('Caio', 'Rua Camomila');
    await addOrderByKeyboard();
    expect(postedBodies(api, '/orders')).toEqual(orderedWith(true));
  });

  it('o cliente achado traz o padrão do bairro dele', async () => {
    const api = apiWithZones();
    api.customers = [
      {
        id: 7,
        name: 'Ana',
        phone: null,
        street: 'Rua A',
        number: '12',
        reference: null,
        deliveryZoneId: 2,
      },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Nome do cliente', 'Ana');
    await userEvent.tab();
    expect(await screen.findByDisplayValue('Colinas 1')).toBeInTheDocument();
    expect(codeSwitch()).toBeChecked();
  });
});
