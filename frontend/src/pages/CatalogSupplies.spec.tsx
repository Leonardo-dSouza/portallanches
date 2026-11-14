import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

const SODA: Supply = {
  id: 1,
  name: 'Refrigerante iT Laranja 2L',
  countUnit: 'un',
  minStock: '6',
  unitCost: null,
  deductOnSale: true,
  dailyCount: false,
  sectionId: null,
  saleProduct: null,
  active: true,
  packages: [{ name: 'fardo', quantity: '6' }],
};

async function openSupplies(api = new FakeApiClient()) {
  // Cadastros é do admin, que recebe o custo do insumo (2026-10-25).
  api.role = 'ADMIN';
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Insumos' }));
  // O formulário abre pelo botão "Novo insumo" (2026-10-11), num painel ao lado da lista.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Novo insumo' }),
  );
  await screen.findByRole('heading', { name: 'Novo insumo' });
  return api;
}

const type = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
const bodiesOf = (api: FakeApiClient, method: string) =>
  api.calls
    .filter((c) => c.method === method && c.path.startsWith('/supplies'))
    .map((c) => c.body);

describe('CatalogPage: insumos', () => {
  it('cadastra insumo com embalagem e mostra a conversão na tabela', async () => {
    const api = await openSupplies();
    await type('Nome do insumo', 'Hambúrguer 56g');
    await type('Estoque mínimo (opcional)', '40');
    await click('Adicionar embalagem');
    await type('Embalagem 1', 'caixa');
    await type('Quantidade (un)', '36');
    await click('Adicionar insumo');
    expect(await screen.findByText('caixa = 36 un')).toBeInTheDocument();
    expect(bodiesOf(api, 'POST')).toEqual([
      {
        name: 'Hambúrguer 56g',
        countUnit: 'un',
        minStock: '40',
        deductOnSale: false,
        dailyCount: false,
        sectionId: null,
        active: true,
        packages: [{ name: 'caixa', quantity: '36' }],
      },
    ]);
    expect(
      'unitCost' in (bodiesOf(api, 'POST')[0] as Record<string, unknown>),
    ).toBe(false);
    expect(screen.getByLabelText('Nome do insumo')).toHaveValue('');
  });

  it('edita pelo painel e troca a quantidade da embalagem sem enviar unitCost', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await click(`Editar ${SODA.name}`);
    expect(
      screen.getByRole('heading', { name: `Editar ${SODA.name}` }),
    ).toBeInTheDocument();
    // O painel abre ao lado da lista com o foco no nome, sem procurar com a rolagem.
    expect(screen.getByLabelText('Nome do insumo')).toHaveFocus();
    await userEvent.clear(screen.getByLabelText('Quantidade (un)'));
    await type('Quantidade (un)', '12');
    await click('Salvar alterações');
    expect(await screen.findByText('fardo = 12 un')).toBeInTheDocument();
    expect(bodiesOf(api, 'PUT')).toEqual([
      {
        name: SODA.name,
        countUnit: SODA.countUnit,
        minStock: SODA.minStock,
        deductOnSale: SODA.deductOnSale,
        dailyCount: SODA.dailyCount,
        sectionId: SODA.sectionId,
        active: SODA.active,
        packages: [{ name: 'fardo', quantity: '12' }],
      },
    ]);
    expect(
      'unitCost' in (bodiesOf(api, 'PUT')[0] as Record<string, unknown>),
    ).toBe(false);
    expect(screen.getByRole('heading', { name: 'Novo insumo' })).toBeVisible();
  });

  it('mostra custo só leitura com link para /custos e grava baixa automática', async () => {
    const api = new FakeApiClient();
    api.supplies = [
      {
        ...SODA,
        id: 2,
        name: 'Hambúrguer 56g',
        countUnit: 'un',
        unitCost: '1.2444',
      },
    ];
    await openSupplies(api);
    // Novo insumo (sem custo):
    expect(screen.getByText(/Sem custo/)).toBeInTheDocument();
    const newLink = screen.getByRole('link', { name: 'defina em Custos' });
    expect(newLink).toHaveAttribute('href', '/custos');

    // Ao editar insumo com custo:
    await click('Editar Hambúrguer 56g');
    expect(screen.getByText(/Custo: R\$ 1,2444 \/ un/)).toBeInTheDocument();
    const editLink = screen.getByRole('link', { name: 'muda em Custos' });
    expect(editLink).toHaveAttribute('href', '/custos');

    // Baixa automática ligada grava deductOnSale true sem unitCost
    await userEvent.click(screen.getByLabelText(/Baixa automática na venda/));
    await click('Salvar alterações');
    const putBody = bodiesOf(api, 'PUT')[0] as Record<string, unknown>;
    expect(putBody).toMatchObject({ deductOnSale: false });
    expect('unitCost' in putBody).toBe(false);
  });

  it('"Contar todo dia" é gravado e marca o insumo como diário na tabela', async () => {
    const api = await openSupplies();
    await type('Nome do insumo', 'Tomate');
    await userEvent.click(screen.getByLabelText(/Contar todo dia/));
    await click('Adicionar insumo');
    const row = (await screen.findByText('Tomate')).closest('tr');
    expect(within(row!).getByText('Diário')).toBeInTheDocument();
    expect(bodiesOf(api, 'POST')).toMatchObject([{ dailyCount: true }]);
  });

  it('desativa em um clique e remove embalagem do formulário sem enviar unitCost', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await click(`Desativar ${SODA.name}`);
    const putBody = bodiesOf(api, 'PUT')[0] as Record<string, unknown>;
    expect('unitCost' in putBody).toBe(false);
    expect(putBody).toMatchObject({ name: SODA.name, active: false });
    await click('Adicionar embalagem');
    await click('Remover embalagem 1');
    expect(screen.queryByLabelText('Embalagem 1')).not.toBeInTheDocument();
  });

  it('valor inválido mostra o erro sem chamar a API; nome repetido mostra o 409', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await type('Nome do insumo', 'Leite condensado');
    await type('Estoque mínimo (opcional)', 'pouco');
    await click('Adicionar insumo');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Estoque mínimo inválido "pouco"',
    );
    expect(bodiesOf(api, 'POST')).toEqual([]);
    await userEvent.clear(screen.getByLabelText('Nome do insumo'));
    await userEvent.clear(screen.getByLabelText('Estoque mínimo (opcional)'));
    await type('Nome do insumo', SODA.name);
    await click('Adicionar insumo');
    expect(await screen.findByRole('alert')).toHaveTextContent(/já existe/i);
    // Cabeçalho + título "Sem seção" + o refrigerante.
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      3,
    );
  });

  it('edita o preço de venda da bebida pelo insumo', async () => {
    const api = new FakeApiClient();
    api.supplies = [
      {
        ...SODA,
        saleProduct: {
          id: 9,
          name: 'iT Laranja 2L',
          salePrice: '12.00',
        },
      },
    ];
    await openSupplies(api);
    expect(screen.getByText('R$ 12,00')).toBeInTheDocument();
    await click(`Editar ${SODA.name}`);
    const price = screen.getByLabelText(
      'Preço de venda (Cardápio: iT Laranja 2L)',
    );
    expect(price).toHaveValue('12,00');
    await userEvent.clear(price);
    await userEvent.type(price, '13,50');
    await click('Salvar alterações');
    await waitFor(() =>
      expect(bodiesOf(api, 'PUT')[0]).toMatchObject({ salePrice: '13.50' }),
    );
  });

  it('insumo sem produto 1:1 não mostra o preço de venda', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await click(`Editar ${SODA.name}`);
    expect(screen.queryByLabelText(/Preço de venda/)).not.toBeInTheDocument();
  });

  it('grava a seção escolhida e agrupa e filtra por ela', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await type('Nome do insumo', 'Alface');
    await userEvent.selectOptions(screen.getByLabelText('Seção'), 'Geladeira');
    await click('Adicionar insumo');
    expect(
      await screen.findByRole('columnheader', { name: /Geladeira/ }),
    ).toBeInTheDocument();
    expect(bodiesOf(api, 'POST')[0]).toMatchObject({ sectionId: 1 });
    await userEvent.click(screen.getByRole('button', { name: /^Geladeira/ }));
    expect(screen.queryByText(SODA.name)).not.toBeInTheDocument();
  });
});
