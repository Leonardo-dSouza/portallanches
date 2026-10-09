import { render, screen, waitFor, within } from '@testing-library/react';
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
  dailyCount: false,
  sectionId: null,
  saleProduct: null,
  active: true,
  packages: [],
};

const X_BACON: Product = {
  id: 7,
  categoryId: 2,
  menuNumber: 10,
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
  bundleItems: [],
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
  await userEvent.click(await screen.findByRole('tab', { name: 'Cardápio' }));
  await screen.findByRole('row', { name: /X Bacon/ });
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
  it('lista número e preço; CMV só com "Custos", com ajuda e sem CMV %', async () => {
    await openProducts(fakeApi());
    expect(screen.queryByText('R$ 10,42')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Custos' }));
    expect(
      screen.getByRole('img', { name: /O que é CMV: Custo da mercadoria/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('CMV %')).not.toBeInTheDocument();
    const row = screen.getByRole('row', { name: /X Bacon/ });
    expect(within(row).getByText('10')).toBeInTheDocument();
    expect(within(row).getByText('R$ 25,00')).toBeInTheDocument();
    expect(within(row).getByText('R$ 10,42')).toBeInTheDocument();
    expect(within(row).getByText('incompleto')).toBeInTheDocument();
    expect(within(row).queryByText('41,7%')).not.toBeInTheDocument();
  });

  it('cadastra lanche com composição na unidade do insumo', async () => {
    const api = fakeApi();
    await openProducts(api);
    await click('Novo item');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), '1');
    await type('Nº no cardápio', '9');
    await type('Nome do item', 'X Salada');
    await type('Preço de venda (opcional)', '17,80');
    await click('Adicionar insumo');
    await userEvent.selectOptions(screen.getByLabelText('Insumo 1'), '4');
    await type('Quantidade 1 (kg)', '0,036');
    await click('Adicionar item');
    expect(await screen.findByRole('row', { name: /X Salada/ })).toBeVisible();
    expect(productBodies(api, 'POST')).toEqual([
      {
        categoryId: 1,
        menuNumber: 9,
        name: 'X Salada',
        description: null,
        salePrice: '17.80',
        active: true,
        components: [{ supplyId: 4, quantity: '0.036' }],
        bundleItems: [],
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
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Editar/ }),
      ).not.toBeInTheDocument(),
    );
    expect(productBodies(api, 'PUT')).toMatchObject([
      { components: [{ supplyId: 4, quantity: '0.06' }] },
    ]);
    await click(`Desativar ${X_BACON.name}`);
    expect(productBodies(api, 'PUT')[1]).toMatchObject({ active: false });
  });

  it('erro de validação aparece sem chamar a API', async () => {
    const api = fakeApi();
    await openProducts(api);
    await click('Novo item');
    await type('Nome do item', 'X Egg');
    await click('Adicionar item');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha a categoria do item',
    );
    expect(productBodies(api, 'POST')).toEqual([]);
  });

  it('busca por ingrediente ou número e filtra por categoria sem paginar', async () => {
    const api = fakeApi();
    api.products = [
      X_BACON,
      {
        ...X_BACON,
        id: 8,
        categoryId: 1,
        categoryName: 'Tradicional',
        menuNumber: 9,
        name: 'X Salada',
        description: 'queijo, alface',
      },
    ];
    await openProducts(api);
    await type('Buscar no cardápio', 'alface');
    expect(screen.queryByText('queijo, alface')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Ingredientes' }));
    expect(screen.getByText('queijo, alface')).toBeVisible();
    expect(
      screen.queryByRole('row', { name: /X Bacon/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /X Salada/ })).toBeVisible();
    await userEvent.clear(screen.getByLabelText('Buscar no cardápio'));
    await click('Artesanal 1');
    expect(
      screen.queryByRole('row', { name: /X Salada/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artesanal 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await click('Todos 2');
    await type('Buscar no cardápio', '10');
    expect(screen.getByRole('row', { name: /X Bacon/ })).toBeVisible();
    expect(
      screen.queryByRole('row', { name: /X Salada/ }),
    ).not.toBeInTheDocument();
  });
});
