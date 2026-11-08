import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// A nota de exemplo: 1 BACON EXEMPLO kg (24,83) e 2 REF COLA 350ML (41,88); a pagar 64,91.
const NOTE_FIELD = 'Colar link ou chave';
const COLA = 'Fora da lanchonete: REF COLA 350ML';
const BACON = 'Fora da lanchonete: BACON EXEMPLO kg';
const DISCOUNT_FIELD = 'Quanto do desconto é da lanchonete';

async function openExpenses(api = new FakeApiClient()) {
  api.invoicePreviews[INVOICE_LINK] ??= INVOICE_PREVIEW;
  await renderCashier(api);
  await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
  return api;
}

async function readNote() {
  await click('Importar nota fiscal');
  await type(NOTE_FIELD, `${INVOICE_LINK}{Enter}`);
}

async function readNoteAndOpenItems() {
  await readNote();
  const card = await screen.findByRole('group', { name: 'Nota fiscal lida' });
  await userEvent.click(
    within(card).getByRole('button', { name: 'Ver itens' }),
  );
  return screen.findByRole('dialog', { name: 'Exemplo' });
}

const closeDialog = (dialog: HTMLElement) =>
  userEvent.click(within(dialog).getAllByRole('button', { name: 'Fechar' })[0]);

const amount = () => screen.getByLabelText('Valor');

// Pedido do usuário (2026-10-25): pão de forma, massa de tomate… vêm na nota e não são da lanchonete.
describe('Caixa → Gastos: itens da nota fora da lanchonete', () => {
  it('marcar tira o item do Valor; desmarcar devolve', async () => {
    await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(amount()).toHaveValue('23,03');
    expect(
      within(dialog).getByText('Fora da lanchonete (1)'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('R$ 23,03')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(amount()).toHaveValue('64,91');
  });

  it('salva com as posições de fora e mostra quanto saiu', async () => {
    const api = await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    await closeDialog(dialog);
    expect(screen.getByText(/2 itens · 1 fora/)).toBeInTheDocument();
    expect(
      screen.getByText('Nota: R$ 64,91 · fora da lanchonete: R$ 41,88'),
    ).toBeInTheDocument();
    await type('Tipo', 'gás');
    await click('Adicionar gasto');
    expect(postedBodies(api, '/expenses')).toEqual([
      {
        amount: '23.03',
        businessDiscount: '1.80',
        description: 'Exemplo',
        expenseTypeId: 1,
        invoiceCode: INVOICE_LINK,
        outsidePositions: [2],
      },
    ]);
    expect(
      await screen.findByRole('button', {
        name: 'Ver 2 itens · 1 fora da nota',
      }),
    ).toBeInTheDocument();
  });

  it('o ajuste feito à mão no Valor continua (a marca mexe só pela diferença)', async () => {
    await openExpenses();
    await readNote();
    await screen.findByRole('group', { name: 'Nota fiscal lida' });
    await userEvent.clear(amount());
    await userEvent.type(amount(), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Ver itens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(amount()).toHaveValue('18,12');
  });

  // Pedido do usuário (2026-10-25): a caixinha é pequena; o clique vale na linha inteira.
  it('clicar na linha do item marca e desmarca', async () => {
    await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByText('REF COLA 350ML'));
    expect(within(dialog).getByRole('checkbox', { name: COLA })).toBeChecked();
    expect(amount()).toHaveValue('23,03');
    await userEvent.click(within(dialog).getByText('41,88'));
    expect(
      within(dialog).getByRole('checkbox', { name: COLA }),
    ).not.toBeChecked();
    expect(amount()).toHaveValue('64,91');
  });

  it('o clique na caixinha troca uma vez só (não sobe para a linha)', async () => {
    await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(within(dialog).getByRole('checkbox', { name: COLA })).toBeChecked();
    expect(amount()).toHaveValue('23,03');
  });

  it('a nota inteira não pode ficar de fora', async () => {
    await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: BACON }),
    );
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'A nota inteira não pode ficar fora da lanchonete',
    );
    expect(
      within(dialog).getByRole('checkbox', { name: BACON }),
    ).not.toBeChecked();
    expect(amount()).toHaveValue('23,03');
  });

  it('a nota lida já vem com o que o mercado teve de fora da última vez', async () => {
    const api = new FakeApiClient();
    api.invoicePreviews[INVOICE_LINK] = {
      ...INVOICE_PREVIEW,
      outsidePositions: [2],
    };
    await openExpenses(api);
    const dialog = await readNoteAndOpenItems();
    expect(within(dialog).getByRole('checkbox', { name: COLA })).toBeChecked();
    expect(amount()).toHaveValue('23,03');
  });

  it('na edição, marca na nota salva e manda só as marcas', async () => {
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
    api.invoiceDetails[101] = invoiceDetailOf(101, 7, '64.91');
    await openExpenses(api);
    await click('Editar');
    await userEvent.click(screen.getByRole('button', { name: 'Ver itens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    await userEvent.click(
      await within(dialog).findByRole('checkbox', { name: COLA }),
    );
    expect(amount()).toHaveValue('23,03');
    await closeDialog(dialog);
    await click('Salvar alterações');
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({
      amount: '23.03',
      businessDiscount: '1.80',
      description: 'Exemplo',
      expenseTypeId: 1,
      outsidePositions: [2],
    });
  });

  it('a nota salva mostra os itens de fora marcados, mesmo só para ler', async () => {
    const api = new FakeApiClient();
    const detail = invoiceDetailOf(101, 7, '23.03');
    api.expenses = [
      {
        id: 7,
        expenseTypeId: 1,
        description: 'Exemplo',
        amount: '23.03',
        invoice: {
          ...invoiceSummaryOf(101),
          outsideItemCount: 1,
          outsideTotal: '41.88',
        },
      },
    ];
    api.invoiceDetails[101] = {
      ...detail,
      items: detail.items.map((item) => ({
        ...item,
        outsideBusiness: item.position === 2,
      })),
    };
    await openExpenses(api);
    await click('Ver 2 itens · 1 fora da nota');
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    expect(within(dialog).getByText('Fora')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    // O gasto bate com a parte da lanchonete: sem o aviso de valor diferente.
    expect(within(dialog).queryByText(/Gasto lançado/)).toBeNull();
  });

  // Pedido do usuário (2026-11-08): quanto do desconto é da lanchonete.
  it('mostra o campo de desconto só com itens de fora, preenchido com o desconto total, e recalcula ao mudar', async () => {
    const api = await openExpenses();
    const dialog = await readNoteAndOpenItems();
    expect(within(dialog).queryByLabelText(DISCOUNT_FIELD)).toBeNull();

    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    const discountInput = within(dialog).getByLabelText(DISCOUNT_FIELD);
    expect(discountInput).toHaveValue('1,80');
    expect(amount()).toHaveValue('23,03');
    expect(within(dialog).getByText('R$ 23,03')).toBeInTheDocument();

    await userEvent.clear(discountInput);
    await userEvent.type(discountInput, '0');
    expect(amount()).toHaveValue('24,83');
    expect(within(dialog).getByText('R$ 24,83')).toBeInTheDocument();
    expect(within(dialog).getByText('− R$ 40,08')).toBeInTheDocument();

    await closeDialog(dialog);
    await type('Tipo', 'gás');
    await click('Adicionar gasto');
    expect(postedBodies(api, '/expenses')).toEqual([
      {
        amount: '24.83',
        businessDiscount: '0.00',
        description: 'Exemplo',
        expenseTypeId: 1,
        invoiceCode: INVOICE_LINK,
        outsidePositions: [2],
      },
    ]);
  });

  it('esconde o campo de desconto se desmarcar todos os itens de fora', async () => {
    await openExpenses();
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(within(dialog).getByLabelText(DISCOUNT_FIELD)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: COLA }));
    expect(within(dialog).queryByLabelText(DISCOUNT_FIELD)).toBeNull();
  });

  it('respeita o limite mínimo do desconto na nota lida e não deixa fechar fora dele', async () => {
    const api = new FakeApiClient();
    const preview = {
      ...INVOICE_PREVIEW,
      invoice: {
        ...INVOICE_PREVIEW.invoice,
        items: [
          { ...INVOICE_PREVIEW.invoice.items[0], total: '1.00' },
          INVOICE_PREVIEW.invoice.items[1],
        ],
      },
    };
    api.invoicePreviews[INVOICE_LINK] = preview;
    await openExpenses(api);
    const dialog = await readNoteAndOpenItems();
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: BACON }),
    );
    const discountInput = within(dialog).getByLabelText(DISCOUNT_FIELD);

    // Desconto 1.80 e fora 1.00 -> mínimo 0.80
    await userEvent.clear(discountInput);
    await userEvent.type(discountInput, '0,50');
    expect(
      within(dialog).getByText('O desconto deve ficar entre R$ 0,80 e R$ 1,80'),
    ).toBeInTheDocument();
    const closeButtons = within(dialog).getAllByRole('button', {
      name: 'Fechar',
    });
    const footerClose = closeButtons.find(
      (btn) =>
        btn.className.includes('button') &&
        !btn.className.includes('button-ghost'),
    );
    expect(footerClose).toBeDisabled();

    await userEvent.clear(discountInput);
    await userEvent.type(discountInput, '1,00');
    expect(
      within(dialog).queryByText(/O desconto deve ficar entre/),
    ).toBeNull();
    expect(footerClose).not.toBeDisabled();
  });

  it('ao editar gasto com nota, o valor gravado de businessDiscount aparece e é mantido ao salvar sem mexer', async () => {
    const api = new FakeApiClient();
    const detail = invoiceDetailOf(101, 7, '23.03');
    api.expenses = [
      {
        id: 7,
        expenseTypeId: 1,
        description: 'Exemplo',
        amount: '23.03',
        invoice: {
          ...invoiceSummaryOf(101),
          outsideItemCount: 1,
          outsideTotal: '41.88',
          businessDiscount: '1.20',
        },
      },
    ];
    api.invoiceDetails[101] = {
      ...detail,
      businessDiscount: '1.20',
      items: detail.items.map((item) => ({
        ...item,
        outsideBusiness: item.position === 2,
      })),
    };
    await openExpenses(api);
    await click('Editar');

    // Salvar sem mexer na nota não manda campos de nota no PUT
    await userEvent.clear(screen.getByLabelText('Observação (opcional)'));
    await userEvent.type(
      screen.getByLabelText('Observação (opcional)'),
      'Compra alterada',
    );
    await click('Salvar alterações');
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({
      amount: '23.03',
      description: 'Compra alterada',
      expenseTypeId: 1,
    });

    // Abrir "Ver itens" traz o valor gravado
    await click('Editar');
    await userEvent.click(screen.getByRole('button', { name: 'Ver itens' }));
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    const discountInput = within(dialog).getByLabelText(DISCOUNT_FIELD);
    expect(discountInput).toHaveValue('1,20');

    // Ao marcar mais um item (BACON), 1.20 continua na faixa e é mantido
    await userEvent.click(
      await within(dialog).findByRole('checkbox', { name: BACON }),
    );
    expect(discountInput).toHaveValue('1,20');
  });
});
