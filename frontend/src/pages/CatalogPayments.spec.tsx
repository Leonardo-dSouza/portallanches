import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

async function openPayments(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Pagamentos' }));
  await screen.findByText('PIX');
  return api;
}

const rowOf = (name: string) =>
  screen.getByText(name).closest('tr') as HTMLElement;

describe('CatalogPage: formas de pagamento', () => {
  it('lista as formas com a situação', async () => {
    await openPayments();
    expect(within(rowOf('PIX')).getByText('Ativo')).toBeInTheDocument();
    expect(within(rowOf('Dinheiro')).getByText('Ativo')).toBeInTheDocument();
  });

  it('cria a forma nova no fim da ordem (maior ordem + 1)', async () => {
    const api = await openPayments();
    await userEvent.type(
      screen.getByLabelText('Nome da forma'),
      'Vale refeição',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar forma' }),
    );
    expect(await screen.findByText('Vale refeição')).toBeInTheDocument();
    const posted = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/payment-methods',
    );
    expect(posted?.body).toEqual({
      name: 'Vale refeição',
      active: true,
      sortOrder: 2,
    });
  });

  it('renomear mantém a ordem de exibição', async () => {
    const api = await openPayments();
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Dinheiro' }),
    );
    const name = screen.getByLabelText('Nome da forma Dinheiro');
    await userEvent.clear(name);
    await userEvent.type(name, 'Espécie');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar Dinheiro' }),
    );
    expect(await screen.findByText('Espécie')).toBeInTheDocument();
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.path).toBe('/payment-methods/2');
    expect(put?.body).toEqual({ name: 'Espécie', active: true, sortOrder: 1 });
  });

  it('desativa uma forma e ela some da lista', async () => {
    await openPayments();
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Dinheiro' }),
    );
    await screen.findByText('PIX');
    expect(screen.queryByText('Dinheiro')).toBeNull();
  });

  it('a última forma ativa não pode ser desativada e o botão explica o motivo', async () => {
    await openPayments();
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Dinheiro' }),
    );
    await screen.findByText('PIX');
    const last = screen.getByRole('button', { name: 'Desativar PIX' });
    expect(last).toBeDisabled();
    expect(last).toHaveAttribute(
      'title',
      expect.stringContaining('Pelo menos uma'),
    );
  });

  it('nome repetido mostra o erro amigável', async () => {
    await openPayments();
    await userEvent.type(screen.getByLabelText('Nome da forma'), 'pix');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar forma' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um cadastro com esse nome',
    );
  });
});
