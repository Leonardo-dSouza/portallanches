import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/api-client';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  INVOICE_LINK,
  INVOICE_PREVIEW,
  invoiceDetailOf,
  invoiceSummaryOf,
} from '../test-support/invoice-fixture';
import {
  click,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

const NOTE_FIELD = 'Nota fiscal (link ou chave)';

async function openExpenses(api = new FakeApiClient()) {
  api.invoicePreviews[INVOICE_LINK] = INVOICE_PREVIEW;
  await renderCashier(api);
  await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
  return api;
}

const readNote = () => type(NOTE_FIELD, `${INVOICE_LINK}{Enter}`);
const invoiceCard = () =>
  screen.getByRole('group', { name: 'Nota fiscal lida' });

describe('Caixa → Gastos com a nota fiscal', () => {
  it('o Enter no campo da nota lê a nota em vez de salvar o gasto', async () => {
    const api = await openExpenses();
    await readNote();
    expect(await screen.findByRole('group', { name: 'Nota fiscal lida' }));
    expect(postedBodies(api, '/expenses')).toEqual([]);
    expect(postedBodies(api, '/expense-invoices/preview')).toEqual([
      { code: INVOICE_LINK },
    ]);
  });

  it('a nota lida preenche o valor e a observação e vai junto ao salvar', async () => {
    const api = await openExpenses();
    await readNote();
    const card = await screen.findByRole('group', { name: 'Nota fiscal lida' });
    expect(within(card).getByText('Exemplo')).toBeInTheDocument();
    expect(within(card).getByText('R$ 64,91')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor')).toHaveValue('64,91');
    expect(screen.getByLabelText('Valor')).toHaveFocus();
    expect(screen.getByLabelText('Observação (opcional)')).toHaveValue(
      'Exemplo',
    );
    await type('Tipo', 'gás');
    await click('Adicionar gasto');
    expect(postedBodies(api, '/expenses')).toEqual([
      {
        amount: '64.91',
        description: 'Exemplo',
        expenseTypeId: 1,
        invoiceCode: INVOICE_LINK,
      },
    ]);
    expect(await screen.findByRole('button', { name: 'Ver 2 itens da nota' }));
  });

  it('link colado sem ler não salva o gasto sem a nota: pede para ler', async () => {
    const api = await openExpenses();
    await type(NOTE_FIELD, INVOICE_LINK);
    await type('Tipo', 'gás');
    await type('Valor', '64,91');
    await click('Adicionar gasto');
    expect(postedBodies(api, '/expenses')).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Leia a nota antes de salvar',
    );
  });

  it('valor diferente da nota mostra o valor da nota ao lado', async () => {
    await openExpenses();
    await readNote();
    await screen.findByRole('group', { name: 'Nota fiscal lida' });
    await userEvent.clear(screen.getByLabelText('Valor'));
    await type('Valor', '60');
    expect(screen.getByText('Nota: R$ 64,91')).toBeInTheDocument();
  });

  it('a recusa da API aparece e o formulário fica como estava', async () => {
    const api = new FakeApiClient();
    api.invoicePreviews[INVOICE_LINK] = new ApiError(
      409,
      'Essa nota já está no gasto #3 (noite de 21/09)',
    );
    await renderCashier(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await readNote();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Essa nota já está no gasto #3 (noite de 21/09)',
    );
    expect(screen.getByLabelText('Valor')).toHaveValue('');
  });

  it('Ver itens mostra os produtos da nota lida, antes de salvar', async () => {
    await openExpenses();
    await readNote();
    await screen.findByRole('group', { name: 'Nota fiscal lida' });
    await userEvent.click(
      within(invoiceCard()).getByRole('button', { name: 'Ver itens' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    expect(within(dialog).getByText('BACON EXEMPLO kg')).toBeInTheDocument();
    expect(within(dialog).getByText('1,248 Kg')).toBeInTheDocument();
    expect(within(dialog).getByText('R$ 64,91')).toBeInTheDocument();
  });

  it('Tirar nota antes de salvar grava o gasto sem nota', async () => {
    const api = await openExpenses();
    await readNote();
    await screen.findByRole('group', { name: 'Nota fiscal lida' });
    await userEvent.click(
      within(invoiceCard()).getByRole('button', { name: 'Tirar nota' }),
    );
    expect(
      screen.queryByRole('group', { name: 'Nota fiscal lida' }),
    ).toBeNull();
    await type('Tipo', 'gás');
    await click('Adicionar gasto');
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '64.91', description: 'Exemplo', expenseTypeId: 1 },
    ]);
  });

  it('na edição de um gasto com nota, Tirar nota manda tirar', async () => {
    const api = new FakeApiClient();
    api.expenses = [
      {
        id: 7,
        expenseTypeId: 1,
        description: 'Exemplo',
        amount: '64.91',
        invoice: invoiceSummaryOf(101),
      },
    ];
    await openExpenses(api);
    await click('Editar');
    await userEvent.click(
      within(invoiceCard()).getByRole('button', { name: 'Tirar nota' }),
    );
    await click('Salvar alterações');
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({ invoiceCode: null });
  });

  it('na lista, o selo da nota abre a nota salva com o valor lançado', async () => {
    const api = new FakeApiClient();
    api.expenses = [
      {
        id: 7,
        expenseTypeId: 1,
        description: 'Exemplo',
        amount: '60.00',
        invoice: invoiceSummaryOf(101),
      },
    ];
    api.invoiceDetails[101] = invoiceDetailOf(101, 7, '60.00');
    await openExpenses(api);
    await click('Ver 2 itens da nota');
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    expect(within(dialog).getByText('REF COLA 350ML')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Gasto lançado: R$ 60,00'),
    ).toBeInTheDocument();
  });
});
