import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeReceiptPrinter } from '../test-support/fake-receipt-printer';
import { CONSUMED_AT } from '../test-support/fake-staff-consumptions';
import { storedItem, storedLine } from '../test-support/order-menu';
import {
  click,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

const AUTO_PRINT_KEY = 'portallanches.caixa.imprimir-ao-salvar';

async function openConsumption(
  api = new FakeApiClient(),
  printer = new FakeReceiptPrinter(),
) {
  await renderCashier(api, printer);
  await userEvent.click(screen.getByRole('tab', { name: 'Consumo' }));
  return api;
}

function consumption(fields: Partial<StaffConsumption> = {}): StaffConsumption {
  return {
    id: 40,
    closingId: 10,
    createdById: 2,
    createdAt: CONSUMED_AT,
    consumerName: 'Bianca',
    items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
    cmvTotal: '7.00',
    missingCostCount: 0,
    ...fields,
  };
}

/**
 * Como a comanda do pedido: Para quem → Enter → Qtd (Enter vazio = 1) → Item → Enter; no fim,
 * Enter com o Qtd e o Item vazios salva.
 */
async function launchByKeyboard(name: string, items = '9{Enter}') {
  await type('Para quem', `${name}{Enter}`);
  await userEvent.keyboard(`{Enter}${items}{Enter}{Enter}`);
}

const consumptionList = () =>
  screen.getByRole('table', { name: 'Consumo interno do dia' });

describe('Caixa → Consumo interno (2026-10-23)', () => {
  beforeEach(() => localStorage.clear());

  it('lança para quem com os itens, só pelo teclado, sem pagamento', async () => {
    const api = await openConsumption();
    await launchByKeyboard('Bianca');
    expect(postedBodies(api, '/staff-consumptions')).toEqual([
      { consumerName: 'Bianca', items: [{ productId: 1, quantity: 1 }] },
    ]);
    const row = await within(consumptionList()).findByRole('row', {
      name: /Bianca/,
    });
    expect(row).toHaveTextContent('1× X Salada');
    expect(screen.getByLabelText('Para quem')).toHaveValue('');
    expect(screen.getByLabelText('Para quem')).toHaveFocus();
  });

  it('o Enter no "Para quem" vai para o Qtd', async () => {
    await openConsumption();
    await type('Para quem', 'Bianca{Enter}');
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
  });

  it('sem dizer para quem não salva e explica', async () => {
    const api = await openConsumption();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}{Enter}{Enter}');
    expect(postedBodies(api, '/staff-consumptions')).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Diga para quem é o consumo',
    );
  });

  it('sem itens não salva e explica', async () => {
    const api = await openConsumption();
    await type('Para quem', 'Bianca');
    await click('Salvar consumo');
    expect(postedBodies(api, '/staff-consumptions')).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Lance pelo menos um item',
    );
  });

  it('sugere os nomes já usados no "Para quem"', async () => {
    const api = new FakeApiClient();
    api.consumerNames = ['Bianca', 'Motoboy'];
    await openConsumption(api);
    const field = screen.getByLabelText('Para quem');
    const list = document.getElementById(field.getAttribute('list') ?? '');
    const options = [...(list?.querySelectorAll('option') ?? [])];
    expect(options.map((o) => o.value)).toEqual(['Bianca', 'Motoboy']);
  });

  it('para o caixa a lista mostra hora, quem e itens, sem o custo (hotfix 2026-10-24)', async () => {
    const api = new FakeApiClient();
    api.staffConsumptions = [consumption()];
    await openConsumption(api);
    const list = consumptionList();
    expect(within(list).getAllByRole('row')[1]).toHaveTextContent('20:30');
    expect(
      within(list).queryByRole('columnheader', { name: 'Custo' }),
    ).toBeNull();
    expect(list).not.toHaveTextContent('R$ 7,00');
  });

  it('para o admin a lista mostra o custo, com os itens sem custo', async () => {
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.staffConsumptions = [
      consumption(),
      consumption({ id: 41, consumerName: 'Leo', missingCostCount: 1 }),
    ];
    await openConsumption(api);
    const rows = within(consumptionList()).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('20:30');
    expect(rows[0]).toHaveTextContent('R$ 7,00');
    expect(rows[1]).toHaveTextContent('1 sem custo');
  });

  it('o aviso de estoque aparece depois de salvar, como no pedido', async () => {
    const api = new FakeApiClient();
    api.stockShortfalls = [
      { supplyId: 30, supplyName: 'It Laranja 2L', missing: '1' },
    ];
    await openConsumption(api);
    await launchByKeyboard('Equipe');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Consumido além do estoque do sistema: It Laranja 2L',
    );
  });

  it('editar carrega o consumo e salva por cima', async () => {
    const api = new FakeApiClient();
    api.staffConsumptions = [consumption()];
    await openConsumption(api);
    await click('Editar o consumo de Bianca');
    expect(screen.getByLabelText('Para quem')).toHaveValue('Bianca');
    await userEvent.clear(screen.getByLabelText('Para quem'));
    await type('Para quem', 'Bianca S.');
    await click('Salvar consumo');
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put).toMatchObject({
      path: '/staff-consumptions/40',
      body: { consumerName: 'Bianca S.', items: [{ productId: 1 }] },
    });
  });

  it('apagar pede o segundo clique e tira da lista', async () => {
    const api = new FakeApiClient();
    api.staffConsumptions = [consumption()];
    await openConsumption(api);
    await click('Apagar o consumo de Bianca');
    expect(api.lines).not.toContain('DELETE /staff-consumptions/40');
    await click('Confirmar: apagar o consumo de Bianca');
    expect(api.lines).toContain('DELETE /staff-consumptions/40');
    expect(
      await screen.findByText('Nenhum consumo neste dia'),
    ).toBeInTheDocument();
  });

  it('com "Imprimir ao salvar" ligado, a comanda sai marcada e sem preços', async () => {
    localStorage.setItem(AUTO_PRINT_KEY, 'sim');
    const printer = new FakeReceiptPrinter();
    await openConsumption(new FakeApiClient(), printer);
    await launchByKeyboard('Bianca');
    await within(consumptionList()).findByRole('row', { name: /Bianca/ });
    expect(printer.printed).toHaveLength(1);
    expect(printer.printed[0]).toMatchObject({
      kind: 'staff',
      name: 'Bianca',
      showPrices: false,
      totals: [],
    });
  });

  it('Reimprimir na lista sai mesmo com o "Imprimir ao salvar" desligado', async () => {
    const api = new FakeApiClient();
    api.staffConsumptions = [consumption()];
    const printer = new FakeReceiptPrinter();
    await openConsumption(api, printer);
    await click('Reimprimir o consumo de Bianca');
    expect(printer.printed.map((r) => r.name)).toEqual(['Bianca']);
  });

  it('dia fechado não lança nem apaga', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    api.staffConsumptions = [consumption()];
    await openConsumption(api);
    expect(screen.queryByLabelText('Para quem')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Apagar o consumo de Bianca' }),
    ).toBeNull();
  });
});
