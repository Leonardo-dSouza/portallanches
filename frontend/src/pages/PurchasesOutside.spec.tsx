import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { invoiceDetailOf } from '../test-support/invoice-fixture';
import {
  BACON_HISTORY,
  PURCHASE_INVOICES,
  PURCHASE_PRODUCTS,
} from '../test-support/purchase-fixture';
import { PurchasesPage } from './PurchasesPage';

// A nota 101 (gasto #7 lançado com 60,00): BACON EXEMPLO kg 24,83 e REF COLA 350ML 41,88.
const COLA = 'Fora da lanchonete: REF COLA 350ML';

function renderPurchases(expenseAmount = '60.00') {
  const api = new FakeApiClient();
  api.role = 'ADMIN';
  api.purchases.invoices = PURCHASE_INVOICES;
  api.purchases.products = PURCHASE_PRODUCTS;
  api.purchases.history['1|1128810'] = BACON_HISTORY;
  api.invoiceDetails[101] = invoiceDetailOf(101, 7, expenseAmount);
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter initialEntries={['/compras']}>
        <PurchasesPage today={new Date(2026, 8, 22)} />
      </MemoryRouter>
    </ApiContext.Provider>,
  );
  return api;
}

async function openInvoice() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Ver a nota 25767' }),
  );
  return screen.findByRole('dialog', { name: 'Exemplo' });
}

const putBodies = (api: FakeApiClient) =>
  api.calls
    .filter((c) => c.method === 'PUT' && c.path.endsWith('/outside-items'))
    .map((c) => c.body);

const timesAsked = (api: FakeApiClient, path: string) =>
  api.lines.filter((line) => line.startsWith(`GET ${path}`)).length;

// Pedido do usuário (2026-10-25): marcar em Compras o que não é da lanchonete; o gasto acompanha.
describe('Compras: itens da nota fora da lanchonete', () => {
  it('marca na nota, salva e o gasto da noite cai; a lista relê', async () => {
    const api = renderPurchases();
    const dialog = await openInvoice();
    const save = within(dialog).getByRole('button', {
      name: 'Salvar marcação',
    });
    expect(save).toBeDisabled();
    await userEvent.click(
      await within(dialog).findByRole('checkbox', { name: COLA }),
    );
    await userEvent.click(save);
    expect(putBodies(api)).toEqual([{ positions: [2] }]);
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Salvo: gasto da noite R$ 18,12',
    );
    expect(save).toBeDisabled();
    expect(timesAsked(api, '/purchases/invoices')).toBe(2);
  });

  it('a recusa do servidor aparece na nota', async () => {
    // Lançado com 30,00: tirar o refri (41,88) deixaria o gasto negativo.
    const api = renderPurchases('30.00');
    const dialog = await openInvoice();
    await userEvent.click(
      await within(dialog).findByRole('checkbox', { name: COLA }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar marcação' }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'O gasto #7 ficaria com R$ -11.88',
    );
    expect(putBodies(api)).toHaveLength(1);
  });

  it('a lista de notas mostra quantos itens ficaram de fora', async () => {
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.purchases.invoices = [{ ...PURCHASE_INVOICES[0], outsideItemCount: 1 }];
    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter initialEntries={['/compras']}>
          <PurchasesPage today={new Date(2026, 8, 22)} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );
    expect(await screen.findByText('1 fora')).toBeInTheDocument();
  });

  it('marcar pela nota do Histórico relê os preços atrás', async () => {
    const api = renderPurchases();
    await userEvent.click(await screen.findByRole('tab', { name: 'Preços' }));
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Histórico de BACON EXEMPLO kg no Exemplo',
      }),
    );
    const history = await screen.findByRole('dialog', {
      name: 'BACON EXEMPLO kg',
    });
    await userEvent.click(
      within(history).getAllByRole('button', { name: 'Ver a nota 25767' })[0],
    );
    const invoice = await screen.findByRole('dialog', { name: 'Exemplo' });
    await userEvent.click(
      await within(invoice).findByRole('checkbox', { name: COLA }),
    );
    await userEvent.click(
      within(invoice).getByRole('button', { name: 'Salvar marcação' }),
    );
    await within(invoice).findByRole('status');
    expect(timesAsked(api, '/purchases/products?')).toBe(2);
    expect(timesAsked(api, '/purchases/products/history')).toBe(2);
  });
});
