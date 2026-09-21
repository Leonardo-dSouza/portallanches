import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

function zone(id: number, neighborhood: string, fee: string, active = true) {
  return {
    id,
    neighborhood,
    neighborhoodKey: neighborhood.toLowerCase(),
    fee,
    active,
  };
}

function seededApi() {
  const api = new FakeApiClient();
  api.zones = [
    zone(1, 'Uru', '1.00'),
    zone(2, 'Centro', '5.00'),
    zone(3, 'Antigo', '2.00', false),
  ];
  api.expenseTypes = [
    { id: 1, name: 'Gás', nameKey: 'gas', active: true },
    { id: 2, name: 'Embalagens', nameKey: 'embalagens', active: true },
  ];
  return api;
}

async function renderCatalog(api = seededApi()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage />
    </ApiContext.Provider>,
  );
  await screen.findByRole('table');
  return api;
}

const rowOf = (name: string) =>
  screen.getByText(name).closest('tr') as HTMLElement;

describe('CatalogPage: bairros', () => {
  it('lista em ordem alfabética, com taxa formatada, e esconde inativos', async () => {
    await renderCatalog();
    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['Centro', 'Uru']);
    expect(within(rowOf('Uru')).getByText('R$ 1,00')).toBeInTheDocument();
    expect(screen.queryByText('Antigo')).toBeNull();
  });

  it('"Mostrar inativos" revela o bairro inativo e permite reativar', async () => {
    const api = await renderCatalog();
    await userEvent.click(screen.getByLabelText('Mostrar inativos'));
    expect(within(rowOf('Antigo')).getByText('Inativo')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ativar Antigo' }),
    );
    expect(
      await within(rowOf('Antigo')).findByText('Ativo'),
    ).toBeInTheDocument();
    expect(api.calls.at(-2)).toMatchObject({
      method: 'PUT',
      path: '/delivery-zones/3',
      body: { neighborhood: 'Antigo', fee: '2.00', active: true },
    });
  });

  it('cadastra bairro novo com a taxa em formato da API e limpa o formulário', async () => {
    const api = await renderCatalog();
    await userEvent.type(screen.getByLabelText('Nome do bairro'), ' Dunamis ');
    await userEvent.type(screen.getByLabelText('Taxa padrão'), '8,5');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar bairro' }),
    );
    expect(await screen.findByText('Dunamis')).toBeInTheDocument();
    expect(
      api.calls.find((c) => c.method === 'POST' && c.path === '/delivery-zones')
        ?.body,
    ).toEqual({ neighborhood: 'Dunamis', fee: '8.50' });
    expect(screen.getByLabelText('Nome do bairro')).toHaveValue('');
    expect(screen.getByLabelText('Nome do bairro')).toHaveFocus();
  });

  it('taxa inválida mostra o valor digitado e não chama a API', async () => {
    const api = await renderCatalog();
    await userEvent.type(screen.getByLabelText('Nome do bairro'), 'Novo');
    await userEvent.type(screen.getByLabelText('Taxa padrão'), 'abc');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar bairro' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('"abc"');
    expect(api.lines).not.toContain('POST /delivery-zones');
  });

  it('edita nome e taxa e grava com PUT', async () => {
    const api = await renderCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Uru' }));
    const name = screen.getByLabelText('Nome do bairro Uru');
    await userEvent.clear(name);
    await userEvent.type(name, 'Uru Novo');
    const fee = screen.getByLabelText('Taxa de Uru');
    expect(fee).toHaveValue('1,00');
    await userEvent.clear(fee);
    await userEvent.type(fee, '2,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar Uru' }));
    expect(await screen.findByText('Uru Novo')).toBeInTheDocument();
    expect(within(rowOf('Uru Novo')).getByText('R$ 2,50')).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({
      neighborhood: 'Uru Novo',
      fee: '2.50',
      active: true,
    });
  });

  it('cancelar a edição não chama a API', async () => {
    const api = await renderCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Uru' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar edição de Uru' }),
    );
    expect(screen.queryByLabelText('Nome do bairro Uru')).toBeNull();
    expect(api.calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('desativar tira o bairro da lista', async () => {
    await renderCatalog();
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Uru' }),
    );
    await screen.findByText('Centro');
    expect(screen.queryByText('Uru')).toBeNull();
  });

  it('renomear para um nome que já existe mostra o erro amigável', async () => {
    await renderCatalog();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Uru' }));
    const name = screen.getByLabelText('Nome do bairro Uru');
    await userEvent.clear(name);
    await userEvent.type(name, 'centro');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar Uru' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um cadastro com esse nome',
    );
    expect(screen.getByLabelText('Nome do bairro Uru')).toBeInTheDocument();
  });

  it('sem bairros mostra o estado vazio', async () => {
    const api = seededApi();
    api.zones = [];
    render(
      <ApiContext.Provider value={api}>
        <CatalogPage />
      </ApiContext.Provider>,
    );
    expect(
      await screen.findByText('Nenhum item em bairros'),
    ).toBeInTheDocument();
  });
});

describe('CatalogPage: tipos de gasto', () => {
  async function openTypes() {
    const api = await renderCatalog();
    await userEvent.click(screen.getByRole('tab', { name: 'Tipos de gasto' }));
    await screen.findByText('Embalagens');
    return api;
  }

  it('lista, cria e recarrega', async () => {
    const api = await openTypes();
    await userEvent.type(screen.getByLabelText('Nome do tipo'), 'Freelancers');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar tipo' }),
    );
    expect(await screen.findByText('Freelancers')).toBeInTheDocument();
    expect(
      api.calls.find((c) => c.path === '/expense-types' && c.method === 'POST')
        ?.body,
    ).toEqual({ name: 'Freelancers' });
  });

  it('renomeia e desativa', async () => {
    const api = await openTypes();
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Embalagens' }),
    );
    const name = screen.getByLabelText('Nome do tipo Embalagens');
    await userEvent.clear(name);
    await userEvent.type(name, 'Descartáveis');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar Embalagens' }),
    );
    await screen.findByText('Descartáveis');
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Descartáveis' }),
    );
    await screen.findByText('Gás');
    expect(screen.queryByText('Descartáveis')).toBeNull();
    expect(api.calls.at(-2)?.body).toEqual({
      name: 'Descartáveis',
      active: false,
    });
  });

  it('nome vazio não chama a API', async () => {
    const api = await openTypes();
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar tipo' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe o nome do tipo de gasto',
    );
    expect(api.lines).not.toContain('POST /expense-types');
  });
});
