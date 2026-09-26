import { render, screen, within } from '@testing-library/react';
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
    await userEvent.clear(screen.getByLabelText('Quantidade (un)'));
    await type('Quantidade (un)', '12');
    await click('Salvar alterações');
    expect(await screen.findByText('fardo = 12 un')).toBeInTheDocument();
    expect(bodiesOf(api, 'PUT')).toEqual([
      { ...SODA, id: undefined, packages: [{ name: 'fardo', quantity: '12' }] },
    ]);
    expect(screen.getByRole('heading', { name: 'Novo insumo' })).toBeVisible();
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
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
  });
});
