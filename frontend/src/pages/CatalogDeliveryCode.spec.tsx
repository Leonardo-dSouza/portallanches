import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { openCatalogSection } from '../test-support/catalog-nav';
import { CatalogPage } from './CatalogPage';

/** Colinas 1 com o código ligado, Centro sem (2026-11-21). */
async function renderZones() {
  const api = new FakeApiClient();
  const base = { fee: '5.00', active: true };
  api.zones = [
    {
      ...base,
      id: 1,
      neighborhood: 'Colinas 1',
      neighborhoodKey: 'colinas 1',
      requiresDeliveryCode: true,
    },
    {
      ...base,
      id: 2,
      neighborhood: 'Centro',
      neighborhoodKey: 'centro',
      requiresDeliveryCode: false,
    },
  ];
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage />
    </ApiContext.Provider>,
  );
  await openCatalogSection('Entregas', 'Bairros');
  await screen.findByRole('table');
  return api;
}

const codeSwitch = (neighborhood: string) =>
  screen.getByRole('switch', { name: `Código de entrega em ${neighborhood}` });

const lastZonePut = (api: FakeApiClient) =>
  api.calls
    .filter((c) => c.method === 'PUT' && c.path.startsWith('/delivery-zones'))
    .at(-1);

describe('Cadastros → Bairros: código de entrega', () => {
  it('mostra de relance quais bairros têm o código ligado', async () => {
    await renderZones();
    expect(codeSwitch('Colinas 1')).toHaveAttribute('aria-checked', 'true');
    expect(codeSwitch('Centro')).toHaveAttribute('aria-checked', 'false');
  });

  it('a tecla liga o código e o PUT manda o bairro inteiro', async () => {
    const api = await renderZones();
    await userEvent.click(codeSwitch('Centro'));
    await waitFor(() =>
      expect(codeSwitch('Centro')).toHaveAttribute('aria-checked', 'true'),
    );
    expect(lastZonePut(api)).toMatchObject({
      path: '/delivery-zones/2',
      body: {
        neighborhood: 'Centro',
        fee: '5.00',
        active: true,
        requiresDeliveryCode: true,
      },
    });
  });

  it('editar a taxa e desativar mantêm o código ligado', async () => {
    const api = await renderZones();
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Colinas 1' }),
    );
    const fee = screen.getByLabelText('Taxa de Colinas 1');
    await userEvent.clear(fee);
    await userEvent.type(fee, '6');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar Colinas 1' }),
    );
    await waitFor(() =>
      expect(lastZonePut(api)?.body).toMatchObject({
        fee: '6.00',
        requiresDeliveryCode: true,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Colinas 1' }),
    );
    await waitFor(() =>
      expect(lastZonePut(api)?.body).toMatchObject({
        active: false,
        requiresDeliveryCode: true,
      }),
    );
  });
});

describe('Cadastros → Bairros: mensagens do código', () => {
  const form = () =>
    screen.getByRole('form', { name: 'Mensagens do código de entrega' });

  it('abre com as mensagens gravadas', async () => {
    const api = new FakeApiClient();
    api.settings.deliveryCodeRouteMessage = 'Saiu! Código [CÓDIGO]';
    render(
      <ApiContext.Provider value={api}>
        <CatalogPage />
      </ApiContext.Provider>,
    );
    await openCatalogSection('Entregas', 'Bairros');
    await waitFor(() =>
      expect(
        within(form()).getByLabelText('Mensagem quando sai para entrega'),
      ).toHaveValue('Saiu! Código [CÓDIGO]'),
    );
  });

  it('salva só as duas mensagens no PUT /settings', async () => {
    const api = await renderZones();
    const confirm = within(form()).getByLabelText(
      'Mensagem ao confirmar o pedido',
    );
    await userEvent.clear(confirm);
    await userEvent.type(confirm, 'Seu código: [[CÓDIGO]');
    await userEvent.click(
      within(form()).getByRole('button', { name: 'Salvar mensagens' }),
    );
    expect(await within(form()).findByRole('status')).toHaveTextContent(
      'Mensagens salvas.',
    );
    const put = api.calls.find(
      (c) => c.method === 'PUT' && c.path === '/settings',
    );
    expect(put?.body).toEqual({
      deliveryCodeConfirmMessage: 'Seu código: [CÓDIGO]',
      deliveryCodeRouteMessage: api.settings.deliveryCodeRouteMessage,
    });
  });
});
