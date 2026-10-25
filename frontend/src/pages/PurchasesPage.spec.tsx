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
  PURCHASE_VENDORS,
} from '../test-support/purchase-fixture';
import { PurchasesPage } from './PurchasesPage';

const TODAY = new Date(2026, 8, 22);

function apiWithPurchases(): FakeApiClient {
  const api = new FakeApiClient();
  api.role = 'ADMIN';
  api.purchases.invoices = PURCHASE_INVOICES;
  api.purchases.products = PURCHASE_PRODUCTS;
  api.purchases.history['1|1128810'] = BACON_HISTORY;
  api.purchases.vendors = PURCHASE_VENDORS;
  api.invoiceDetails[101] = invoiceDetailOf(101, 7, '60.00');
  return api;
}

function renderPurchases(api = apiWithPurchases()) {
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter initialEntries={['/compras']}>
        <PurchasesPage today={TODAY} />
      </MemoryRouter>
    </ApiContext.Provider>,
  );
  return api;
}

const rowOf = (text: string) =>
  within(screen.getByText(text).closest('tr') as HTMLElement);

async function openTab(name: string) {
  await userEvent.click(await screen.findByRole('tab', { name }));
}

describe('PurchasesPage → Notas', () => {
  it('abre nas notas do mês, com o total do período', async () => {
    const api = renderPurchases();
    expect(await screen.findByText('MERCADO DOIS LTDA')).toBeInTheDocument();
    expect(api.lines).toContain(
      'GET /purchases/invoices?from=2026-09-01&to=2026-09-30',
    );
    expect(screen.getByText('R$ 266,22')).toBeInTheDocument();
  });

  it('a busca acha a nota pelo mercado ou pelo número', async () => {
    renderPurchases();
    await screen.findByText('MERCADO DOIS LTDA');
    const search = screen.getByRole('searchbox', { name: 'Buscar nota' });
    await userEvent.type(search, 'dois');
    expect(screen.queryByText('Exemplo')).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, '25767');
    expect(screen.queryByText('MERCADO DOIS LTDA')).toBeNull();
    expect(screen.getByText('Exemplo')).toBeInTheDocument();
  });

  it('Ver abre a nota com os itens e o valor lançado no gasto', async () => {
    renderPurchases();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver a nota 25767' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });
    expect(within(dialog).getByText('BACON EXEMPLO kg')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Gasto lançado: R$ 60,00'),
    ).toBeInTheDocument();
  });

  it('a noite do gasto leva à Análise daquele dia', async () => {
    renderPurchases();
    const night = await screen.findByRole('link', { name: 'ter 22/09' });
    expect(night).toHaveAttribute(
      'href',
      '/analise?de=2026-09-22&ate=2026-09-22',
    );
  });
});

describe('PurchasesPage → Preços', () => {
  it('busca o produto sem acento', async () => {
    const api = renderPurchases();
    await openTab('Preços');
    await screen.findByText('BACON EXEMPLO kg');
    expect(api.lines).toContain(
      'GET /purchases/products?from=2026-09-01&to=2026-09-30',
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar produto' }),
      'acucar',
    );
    expect(screen.getByText('AÇÚCAR UNIÃO 1KG')).toBeInTheDocument();
    expect(screen.queryByText('BACON EXEMPLO kg')).toBeNull();
  });

  it('mostra último, anterior e a variação com texto, não só cor', async () => {
    renderPurchases();
    await openTab('Preços');
    await screen.findByText('BACON EXEMPLO kg');
    const bacon = rowOf('BACON EXEMPLO kg');
    // O último (21,50) também é o maior do período; o menor foi 19,90.
    expect(bacon.getAllByText('21,50')).toHaveLength(2);
    expect(bacon.getByText('19,90')).toBeInTheDocument();
    expect(bacon.getByText('20,40')).toBeInTheDocument();
    expect(bacon.getByText('+5,4%')).toBeInTheDocument();
    expect(bacon.getByLabelText('subiu')).toBeInTheDocument();
  });

  it('Histórico abre as compras do produto naquele mercado', async () => {
    const api = renderPurchases();
    await openTab('Preços');
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Histórico de BACON EXEMPLO kg no Exemplo',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'BACON EXEMPLO kg',
    });
    expect(within(dialog).getByText('25001')).toBeInTheDocument();
    expect(within(dialog).getByText('1,248 Kg')).toBeInTheDocument();
    expect(api.lines).toContain(
      'GET /purchases/products/history?vendorId=1&code=1128810&from=2026-09-01&to=2026-09-30',
    );
  });

  // Pedido do usuário (2026-10-25): do histórico, ir para a nota daquela compra.
  it('a compra do histórico abre a nota com o produto destacado', async () => {
    const api = renderPurchases();
    await openTab('Preços');
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Histórico de BACON EXEMPLO kg no Exemplo',
      }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver a nota 25767' }),
    );
    const invoice = await screen.findByRole('dialog', { name: 'Exemplo' });
    const bacon = (
      await within(invoice).findByText('BACON EXEMPLO kg')
    ).closest('tr') as HTMLElement;
    const cola = within(invoice).getByText('REF COLA 350ML').closest('tr');
    expect(bacon).toHaveAttribute('data-highlight', 'true');
    expect(cola).toHaveAttribute('data-highlight', 'false');
    expect(api.lines).toContain('GET /expense-invoices/101');
    // Fechar a nota volta ao histórico, que continua aberto.
    // O X do topo (o rodapé também tem um "Fechar").
    await userEvent.click(
      within(invoice).getAllByRole('button', { name: 'Fechar' })[0],
    );
    expect(screen.queryByRole('dialog', { name: 'Exemplo' })).toBeNull();
    expect(
      screen.getByRole('dialog', { name: 'BACON EXEMPLO kg' }),
    ).toBeInTheDocument();
  });

  it('clicar na linha da compra também abre a nota', async () => {
    renderPurchases();
    await openTab('Preços');
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Histórico de BACON EXEMPLO kg no Exemplo',
      }),
    );
    const history = await screen.findByRole('dialog', {
      name: 'BACON EXEMPLO kg',
    });
    await userEvent.click(await within(history).findByText('1,248 Kg'));
    expect(
      await screen.findByRole('dialog', { name: 'Exemplo' }),
    ).toBeInTheDocument();
  });

  // 2026-10-25: a tecla virou só ícone para a tabela caber; a linha inteira abre o histórico.
  it('clicar na linha do produto também abre o histórico', async () => {
    renderPurchases();
    await openTab('Preços');
    await userEvent.click(await screen.findByText('BACON EXEMPLO kg'));
    expect(
      await screen.findByRole('dialog', { name: 'BACON EXEMPLO kg' }),
    ).toBeInTheDocument();
  });
});

describe('PurchasesPage → Mercados', () => {
  it('dá apelido ao mercado e mostra o novo nome', async () => {
    const api = renderPurchases();
    await openTab('Mercados');
    const field = await screen.findByRole('textbox', {
      name: 'Apelido de MERCADO DOIS LTDA',
    });
    await userEvent.type(field, 'Spani{Enter}');
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put).toEqual({
      method: 'PUT',
      path: '/purchases/vendors/2',
      body: { nickname: 'Spani' },
    });
    expect(
      await screen.findByRole('button', {
        name: 'Salvar apelido de MERCADO DOIS LTDA',
      }),
    ).toBeDisabled();
  });

  it('apagar o apelido manda null', async () => {
    const api = renderPurchases();
    await openTab('Mercados');
    await userEvent.clear(
      await screen.findByRole('textbox', {
        name: 'Apelido de MERCADO EXEMPLO LTDA',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Salvar apelido de MERCADO EXEMPLO LTDA',
      }),
    );
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({
      nickname: null,
    });
  });
});
