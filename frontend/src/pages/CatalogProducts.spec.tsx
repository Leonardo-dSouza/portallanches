import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { Product, Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

const CHEESE: Supply = {
  id: 4,
  name: 'Queijo bandeja',
  countUnit: 'kg',
  minStock: null,
  unitCost: '39.9',
  deductOnSale: true,
  active: true,
  packages: [],
};

const X_BACON: Product = {
  id: 7,
  categoryId: 2,
  categoryName: 'Artesanal',
  name: 'X Bacon',
  description: null,
  salePrice: '25.00',
  active: true,
  components: [
    {
      supplyId: 4,
      supplyName: 'Queijo bandeja',
      countUnit: 'kg',
      unitCost: null,
      quantity: '0.05',
    },
  ],
  cmv: '10.42',
  cmvComplete: false,
  cmvPercent: '41.7',
};

function fakeApi(): FakeApiClient {
  const api = new FakeApiClient();
  api.supplies = [CHEESE];
  api.products = [X_BACON];
  return api;
}

async function openProducts(api: FakeApiClient) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Lanches' }));
  await screen.findByRole('heading', { name: 'Novo lanche' });
}

const type = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
const productBodies = (api: FakeApiClient, method: string) =>
  api.calls
    .filter((c) => c.method === method && c.path.startsWith('/products'))
    .map((c) => c.body);

describe('CatalogPage: lanches', () => {
  it('lista com preço, CMV (avisa se incompleto) e CMV %', async () => {
    await openProducts(fakeApi());
    const row = screen.getByRole('row', { name: /X Bacon/ });
    expect(within(row).getByText('R$ 25,00')).toBeInTheDocument();
    expect(within(row).getByText('R$ 10,42')).toBeInTheDocument();
    expect(within(row).getByText('incompleto')).toBeInTheDocument();
    expect(within(row).getByText('41,7%')).toBeInTheDocument();
  });

  it('cadastra lanche com composição na unidade do insumo', async () => {
    const api = fakeApi();
    await openProducts(api);
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), '1');
    await type('Nome do lanche', 'X Salada');
    await type('Preço de venda (opcional)', '17,80');
    await click('Adicionar insumo');
    await userEvent.selectOptions(screen.getByLabelText('Insumo 1'), '4');
    await type('Quantidade 1 (kg)', '0,036');
    await click('Adicionar lanche');
    expect(await screen.findByRole('row', { name: /X Salada/ })).toBeVisible();
    expect(productBodies(api, 'POST')).toEqual([
      {
        categoryId: 1,
        name: 'X Salada',
        description: null,
        salePrice: '17.80',
        active: true,
        components: [{ supplyId: 4, quantity: '0.036' }],
      },
    ]);
    expect(screen.getByLabelText('Categoria')).toHaveValue('1');
  });

  it('edita pelo formulário do topo e desativa em um clique', async () => {
    const api = fakeApi();
    await openProducts(api);
    await click(`Editar ${X_BACON.name}`);
    await userEvent.clear(screen.getByLabelText('Quantidade 1 (kg)'));
    await type('Quantidade 1 (kg)', '0,06');
    await click('Salvar alterações');
    await screen.findByRole('heading', { name: 'Novo lanche' });
    expect(productBodies(api, 'PUT')).toMatchObject([
      { components: [{ supplyId: 4, quantity: '0.06' }] },
    ]);
    await click(`Desativar ${X_BACON.name}`);
    expect(productBodies(api, 'PUT')[1]).toMatchObject({ active: false });
  });

  it('erro de validação aparece sem chamar a API', async () => {
    const api = fakeApi();
    await openProducts(api);
    await type('Nome do lanche', 'X Egg');
    await click('Adicionar lanche');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha a categoria do lanche',
    );
    expect(productBodies(api, 'POST')).toEqual([]);
  });
});
