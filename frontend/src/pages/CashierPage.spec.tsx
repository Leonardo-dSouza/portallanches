import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Order } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  addOrderByKeyboard,
  click,
  pickCashDate,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

describe('CashierPage: gastos e fechamento', () => {
  it('lança gasto com tipo novo criando o tipo antes', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await type('Tipo', 'Embalagens');
    await type('Valor', '35,90');
    await click('Adicionar gasto');
    expect(await screen.findByText('R$ 35,90')).toBeInTheDocument();
    expect(postedBodies(api, '/expense-types')).toEqual([
      { name: 'Embalagens' },
    ]);
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '35.90', expenseTypeId: 100 },
    ]);
  });

  it('gasto com tipo existente reaproveita o tipo, com observação', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await type('Tipo', 'gás');
    await type('Valor', '120');
    await type('Observação (opcional)', 'botijão');
    await click('Adicionar gasto');
    expect(await screen.findByText('botijão')).toBeInTheDocument();
    expect(postedBodies(api, '/expense-types')).toEqual([]);
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '120.00', description: 'botijão', expenseTypeId: 1 },
    ]);
  });

  it('fecha o dia só após a confirmação e trava as abas', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    await click('Fechar o dia');
    expect(api.lines).not.toContain('POST /closings/today/close');
    await click('Confirmar fechamento');
    expect(await screen.findByText('Fechado')).toBeInTheDocument();
    expect(api.lines).toContain('POST /closings/today/close');
    expect(screen.queryByRole('button', { name: 'Fechar o dia' })).toBeNull();
  });

  it('o relatório mostra os totais vindos da API', async () => {
    await renderCashier();
    await addOrderByKeyboard('9{Enter}');
    await screen.findByText('R$ 17,80');
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    const report = await screen.findByText(/Pedidos \(1\)/);
    expect(
      within(report.parentElement as HTMLElement).getByText('R$ 17,80'),
    ).toBeInTheDocument();
  });
});

describe('CashierPage: escolha de data', () => {
  const SUNDAY_20 = 'domingo, 20 de setembro de 2026';

  it('trocar a data busca aquele dia e lança pedido nele', async () => {
    const api = await renderCashier();
    await pickCashDate(SUNDAY_20);
    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    expect(api.lines).toContain('GET /closings/today?date=2026-09-20');
    await addOrderByKeyboard();
    expect(api.lines).toContain('POST /orders?date=2026-09-20');
  });

  it('voltar para hoje remonta a tela sem data na query', async () => {
    const api = await renderCashier();
    await pickCashDate(SUNDAY_20);
    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    await click('Voltar para hoje');
    await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
    // O cardápio (GET /products) é a última leitura; a de gastos vem logo antes, sem data.
    expect(api.lines.at(-2)).toBe('GET /expenses/today');
  });

  it('data recusada pelo servidor mostra o erro e permite voltar para hoje', async () => {
    const api = new FakeApiClient();
    await renderCashier(api);
    api.rejectDate = '2026-09-20';
    await pickCashDate(SUNDAY_20);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'só acessa hoje',
    );
    await click('Voltar para hoje');
    await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
  });

  it('o caixa só escolhe hoje e os 7 dias anteriores; o admin escolhe qualquer dia', async () => {
    await renderCashier();
    await userEvent.click(
      screen.getByRole('button', { name: /^Data do caixa/ }),
    );
    const day = (name: string) => screen.getByRole('button', { name });
    expect(day('terça, 15 de setembro de 2026')).toBeEnabled();
    expect(day('segunda, 14 de setembro de 2026')).toBeDisabled();
    expect(day('quarta, 23 de setembro de 2026')).toBeDisabled();
    cleanup();
    const admin = new FakeApiClient();
    admin.role = 'ADMIN';
    await renderCashier(admin);
    await userEvent.click(
      screen.getByRole('button', { name: /^Data do caixa/ }),
    );
    expect(day('segunda, 14 de setembro de 2026')).toBeEnabled();
  });
});

describe('CashierPage: cadastros inativados pelo admin', () => {
  it('bairro inativo sai das sugestões, mas o pedido antigo mantém o nome', async () => {
    const api = new FakeApiClient();
    const base = { neighborhoodKey: '', fee: '3.00' };
    api.zones = [
      { id: 1, neighborhood: 'Monterrey', active: true, ...base },
      { id: 2, neighborhood: 'Antigo', active: false, ...base },
    ];
    api.orders = [
      {
        id: 1,
        type: 'DELIVERY',
        amount: '20.00',
        items: [],
        paymentMethodId: 1,
        paymentMode: null,
        deliveryZoneId: 2,
        deliveryFee: '2.00',
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerStreet: null,
        customerNumber: null,
        customerReference: null,
      },
    ] satisfies Order[];
    await renderCashier(api);
    expect(screen.getByText('Antigo')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Entrega'));
    const suggestions = [
      ...document.querySelectorAll('#delivery-zones option'),
    ].map((option) => option.getAttribute('value'));
    expect(suggestions).toEqual(['Monterrey']);
  });

  it('forma de pagamento inativa sai da lista do caixa, mas o pedido antigo mantém o nome', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = [
      { id: 1, name: 'PIX', active: true, sortOrder: 0, isCardTerminal: false },
      {
        id: 2,
        name: 'Vale antigo',
        active: false,
        sortOrder: 1,
        isCardTerminal: false,
      },
    ];
    api.orders = [
      {
        id: 1,
        type: 'COUNTER',
        amount: '20.00',
        items: [],
        paymentMethodId: 2,
        paymentMode: null,
        deliveryZoneId: null,
        deliveryFee: '0.00',
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerStreet: null,
        customerNumber: null,
        customerReference: null,
      },
    ] satisfies Order[];
    await renderCashier(api);
    expect(screen.getByText('Vale antigo')).toBeInTheDocument();
    const keys = within(screen.getByRole('group', { name: 'Pagamento' }))
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label'));
    expect(keys).toEqual(['PIX']);
  });
});
