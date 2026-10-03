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
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Insumos' }));
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
        unitCost: null,
        deductOnSale: true,
        dailyCount: false,
        sectionId: null,
        active: true,
        packages: [{ name: 'caixa', quantity: '36' }],
      },
    ]);
    expect(screen.getByLabelText('Nome do insumo')).toHaveValue('');
  });

  it('edita pelo formulário do topo e troca a quantidade da embalagem', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await click(`Editar ${SODA.name}`);
    expect(
      screen.getByRole('heading', { name: `Editar ${SODA.name}` }),
    ).toBeInTheDocument();
    // O formulário fica no topo da página: o foco vai para ele, sem procurar com a rolagem.
    expect(screen.getByLabelText('Nome do insumo')).toHaveFocus();
    await userEvent.clear(screen.getByLabelText('Quantidade (un)'));
    await type('Quantidade (un)', '12');
    await click('Salvar alterações');
    expect(await screen.findByText('fardo = 12 un')).toBeInTheDocument();
    expect(bodiesOf(api, 'PUT')).toEqual([
      {
        ...SODA,
        id: undefined,
        saleProduct: undefined,
        packages: [{ name: 'fardo', quantity: '12' }],
      },
    ]);
    expect(screen.getByRole('heading', { name: 'Novo insumo' })).toBeVisible();
  });

  it('grava custo por unidade e baixa automática desligada', async () => {
    const api = await openSupplies();
    await type('Nome do insumo', 'Tomate');
    await userEvent.clear(screen.getByLabelText('Unidade de contagem'));
    await type('Unidade de contagem', 'kg');
    await type('Custo por kg (opcional)', '8,99');
    await userEvent.click(screen.getByLabelText(/Baixa automática na venda/));
    await click('Adicionar insumo');
    expect(await screen.findByText('R$ 8,99 / kg')).toBeInTheDocument();
    expect(bodiesOf(api, 'POST')).toMatchObject([
      { unitCost: '8.99', deductOnSale: false },
    ]);
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

  it('desativa em um clique e remove embalagem do formulário', async () => {
    const api = new FakeApiClient();
    api.supplies = [SODA];
    await openSupplies(api);
    await click(`Desativar ${SODA.name}`);
    expect(bodiesOf(api, 'PUT')).toEqual([{ ...SODA, active: false }]);
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
          importSource: 'bebidas',
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
    expect(
      screen.getByText(/reimportar a planilha sobrescreve/),
    ).toBeInTheDocument();
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
