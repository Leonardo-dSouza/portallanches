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

/** Linha pela 1ª célula: "Dinheiro" também é o nome do interruptor e da etiqueta. */
const findRow = (name: string) =>
  screen
    .getAllByRole('row')
    .find((row) => row.querySelector('td')?.textContent?.startsWith(name));
const rowOf = (name: string) => findRow(name) as HTMLElement;

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
      isCardTerminal: false,
      isCash: false,
    });
  });

  it('cadastra uma maquininha, que aparece com a etiqueta', async () => {
    const api = await openPayments();
    await userEvent.type(screen.getByLabelText('Nome da forma'), 'Stone');
    await userEvent.click(screen.getByRole('switch', { name: 'Maquininha' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar forma' }),
    );
    await screen.findByText('Stone');
    expect(within(rowOf('Stone')).getByText('Maquininha')).toBeInTheDocument();
    const posted = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/payment-methods',
    );
    expect(posted?.body).toMatchObject({ name: 'Stone', isCardTerminal: true });
  });

  it('cadastra uma forma "Dinheiro" (troco na entrega); ligar a maquininha desliga o dinheiro', async () => {
    const api = await openPayments();
    await userEvent.type(screen.getByLabelText('Nome da forma'), 'Espécie');
    await userEvent.click(screen.getByRole('switch', { name: 'Dinheiro' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Maquininha' }));
    expect(screen.getByRole('switch', { name: 'Dinheiro' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('switch', { name: 'Dinheiro' }));
    expect(
      screen.getByRole('switch', { name: 'Maquininha' }),
    ).not.toBeChecked();
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar forma' }),
    );
    await screen.findByText('Espécie');
    expect(within(rowOf('Espécie')).getByText('Dinheiro')).toBeInTheDocument();
    const posted = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/payment-methods',
    );
    expect(posted?.body).toMatchObject({ isCash: true, isCardTerminal: false });
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
    expect(put?.body).toEqual({
      name: 'Espécie',
      active: true,
      sortOrder: 1,
      isCardTerminal: false,
      isCash: true,
    });
  });

  it('desativa uma forma e ela some da lista', async () => {
    await openPayments();
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar Dinheiro' }),
    );
    await screen.findByText('PIX');
    expect(findRow('Dinheiro')).toBeUndefined();
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
