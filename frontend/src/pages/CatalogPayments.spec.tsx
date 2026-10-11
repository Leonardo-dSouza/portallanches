import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { openCatalogSection, openNewPanel } from '../test-support/catalog-nav';
import { CatalogPage } from './CatalogPage';

async function openPayments(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await openCatalogSection('Pagamentos e gastos', 'Pagamentos');
  await screen.findByText('PIX');
  return api;
}

/** Linha pela célula do nome: "Dinheiro" também é o nome do interruptor e da etiqueta. */
const findRow = (name: string) =>
  screen
    .getAllByRole('row')
    .find((row) =>
      Array.from(row.querySelectorAll('td')).some((cell) =>
        cell.textContent?.startsWith(name),
      ),
    );
const rowOf = (name: string) => findRow(name) as HTMLElement;

describe('CatalogPage: formas de pagamento', () => {
  it('lista na ordem do caixa, com a tecla de cada forma (2026-10-11)', async () => {
    await openPayments();
    const firstCells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('td')?.textContent);
    expect(firstCells).toEqual(['1', '2']);
    expect(rowOf('PIX')).toHaveTextContent(/^1PIX/);
    expect(rowOf('Dinheiro')).toHaveTextContent(/^2Dinheiro/);
  });

  it('descer manda a ordem nova com todos os ids (a tecla muda junto)', async () => {
    const api = await openPayments();
    expect(screen.getByRole('button', { name: 'Subir PIX' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Descer PIX' }));
    const order = api.calls.find(
      (call) => call.method === 'PUT' && call.path === '/payment-methods/order',
    );
    expect(order?.body).toEqual({ ids: [2, 1] });
    await waitFor(() => expect(rowOf('Dinheiro')).toHaveTextContent(/^1/));
  });

  it('cria a forma nova no fim da ordem (maior ordem + 1)', async () => {
    const api = await openPayments();
    await openNewPanel('Nova forma de pagamento');
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
    await openNewPanel('Nova forma de pagamento');
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
    await openNewPanel('Nova forma de pagamento');
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
    await openNewPanel('Nova forma de pagamento');
    await userEvent.type(screen.getByLabelText('Nome da forma'), 'pix');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar forma' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um cadastro com esse nome',
    );
  });
});
