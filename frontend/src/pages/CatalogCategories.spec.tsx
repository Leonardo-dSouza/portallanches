import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { openNewPanel } from '../test-support/catalog-nav';
import { CatalogPage } from './CatalogPage';

function seededApi() {
  const api = new FakeApiClient();
  api.productCategories = [
    {
      id: 1,
      name: 'Tradicional',
      sortOrder: 1,
      active: true,
      addonCategoryId: null,
      choiceCategoryId: null,
    },
    {
      id: 7,
      name: 'Açaí',
      sortOrder: 2,
      active: true,
      addonCategoryId: null,
      choiceCategoryId: null,
    },
    {
      id: 3,
      name: 'Adicionais',
      sortOrder: 3,
      active: true,
      addonCategoryId: null,
      choiceCategoryId: null,
    },
  ];
  return api;
}

async function renderCategories(api = seededApi()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage />
    </ApiContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Categorias' }));
  await screen.findByRole('table');
  return api;
}

/** Linha cuja 1ª célula é o nome (o nome também aparece nos seletores de adicionais). */
const rowOf = (name: string) =>
  screen
    .getAllByRole('row')
    .find(
      (row) => within(row).queryAllByRole('cell')[0]?.textContent === name,
    ) as HTMLElement;

describe('CatalogPage: categorias', () => {
  it('lista na ordem do cardápio e cria uma categoria nova no fim', async () => {
    const api = await renderCategories();
    await openNewPanel('Nova categoria');
    await userEvent.type(screen.getByLabelText('Nome da categoria'), 'Combos');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar categoria' }),
    );
    await waitFor(() => expect(rowOf('Combos')).toBeDefined());
    const rows = screen.getAllByRole('row');
    expect(
      rows
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent),
    ).toEqual(['Tradicional', 'Açaí', 'Adicionais', 'Combos']);
    expect(api.lines).toContain('POST /product-categories');
  });

  it('todas as categorias podem ser editadas', async () => {
    await renderCategories();
    expect(
      within(rowOf('Tradicional')).getByRole('button', {
        name: 'Editar Tradicional',
      }),
    ).toBeEnabled();
    expect(
      within(rowOf('Açaí')).getByRole('button', { name: 'Editar Açaí' }),
    ).toBeEnabled();
  });

  it('descer manda a ordem nova com todos os ids', async () => {
    const api = await renderCategories();
    expect(
      screen.getByRole('button', { name: 'Subir Tradicional' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Descer Tradicional' }),
    );
    const order = api.calls.find(
      (call) =>
        call.method === 'PUT' && call.path === '/product-categories/order',
    );
    expect(order?.body).toEqual({ ids: [7, 1, 3] });
    // Depois de recarregar, Tradicional desceu: agora já pode subir.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Subir Tradicional' }),
      ).toBeEnabled(),
    );
  });

  it('desativar manda o nome e active false', async () => {
    const api = await renderCategories();
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Açaí' }),
    );
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/product-categories/7',
      body: { name: 'Açaí', active: false },
    });
  });

  it('escolhe de qual categoria vêm os adicionais', async () => {
    const api = await renderCategories();
    await userEvent.selectOptions(
      screen.getByLabelText('Adicionais de Tradicional'),
      'Adicionais',
    );
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/product-categories/1/addon-category',
      body: { addonCategoryId: 3 },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Adicionais de Tradicional')).toHaveValue(
        '3',
      ),
    );
  });

  it('liga a escolha obrigatória (Artesanal → Pão) e ordena as teclas do pão (2026-11-08)', async () => {
    const api = seededApi();
    api.productCategories = [
      ...api.productCategories,
      {
        id: 12,
        name: 'Pão',
        sortOrder: 4,
        active: true,
        addonCategoryId: null,
        choiceCategoryId: null,
      },
    ];
    api.productOrders = {
      12: [
        { id: 65, name: 'Pão Tradicional', sortOrder: 1, active: true },
        { id: 66, name: 'Pão Gergelim', sortOrder: 2, active: true },
        { id: 67, name: 'Pão Brioche', sortOrder: 3, active: true },
      ],
    };
    await renderCategories(api);
    await userEvent.selectOptions(
      screen.getByLabelText('Escolha obrigatória de Tradicional'),
      'Pão',
    );
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/product-categories/1/choice-category',
      body: { choiceCategoryId: 12 },
    });
    const keys = await screen.findByRole('list', { name: 'Teclas de Pão' });
    await userEvent.click(
      within(keys).getByRole('button', { name: 'Descer Pão Tradicional' }),
    );
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/product-categories/12/product-order',
      body: { ids: [66, 65, 67] },
    });
    await waitFor(() =>
      expect(
        within(keys)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['1Pão Gergelim', '2Pão Tradicional', '3Pão Brioche']),
    );
  });
});
