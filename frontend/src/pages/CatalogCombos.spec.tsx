import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { Product } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

const item = (
  id: number,
  name: string,
  overrides: Partial<Product> = {},
): Product => ({
  id,
  categoryId: 1,
  menuNumber: null,
  categoryName: 'Tradicional',
  name,
  description: null,
  salePrice: '10.00',
  active: true,
  components: [],
  bundleItems: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
  ...overrides,
});

function fakeApi(): FakeApiClient {
  const api = new FakeApiClient();
  api.products = [
    item(11, 'X Salada', { menuNumber: 9 }),
    item(60, 'Guaraná lata'),
    item(61, 'Fanta Uva', { active: false }),
  ];
  return api;
}

async function openProducts(api: FakeApiClient) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-10-09" />
    </ApiContext.Provider>,
  );
  await screen.findByRole('row', { name: /X Salada/ });
}

const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));

describe('CatalogPage: combos', () => {
  it('cadastra combo com itens fixos e preço próprio, sem número nem insumos', async () => {
    const api = fakeApi();
    await openProducts(api);
    await click('Novo item');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), '1');
    await userEvent.type(
      screen.getByLabelText('Nome do item'),
      'Combo X Salada',
    );
    await userEvent.type(
      screen.getByLabelText('Preço de venda (opcional)'),
      '19',
    );
    await userEvent.click(screen.getByRole('switch', { name: /Combo/ }));
    expect(screen.queryByLabelText('Nº no cardápio')).not.toBeInTheDocument();
    // Inativo não entra como item do combo.
    expect(
      within(screen.getByLabelText('Item 1')).queryByRole('option', {
        name: 'Fanta Uva',
      }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Item 1'), '11');
    await click('Adicionar item ao combo');
    await userEvent.selectOptions(screen.getByLabelText('Item 2'), '60');
    await click('Adicionar item');
    const posted = api.calls.filter(
      (c) => c.method === 'POST' && c.path === '/products',
    );
    expect(posted.map((c) => c.body)).toEqual([
      expect.objectContaining({
        menuNumber: null,
        salePrice: '19.00',
        components: [],
        bundleItems: [
          { productId: 11, quantity: 1 },
          { productId: 60, quantity: 1 },
        ],
      }),
    ]);
    const row = await screen.findByRole('row', { name: /Combo X Salada/ });
    expect(
      within(row).getByText('1× X Salada + 1× Guaraná lata'),
    ).toBeInTheDocument();
  });
});
