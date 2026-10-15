import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { postedBodies, renderCashier } from '../test-support/render-cashier';

/** Linhas da comanda (a lista some quando está vazia). */
function lineCount(): number {
  const list = screen.queryByRole('list', { name: 'Itens do pedido' });
  return list ? within(list).getAllByRole('listitem').length : 0;
}

/** Qtd vazio → Item "9" → linha; Enter, Enter → pagamento; 1 escolhe a 1ª forma. */
const ONE_LINE_PAID = '{Enter}9{Enter}{Enter}{Enter}1';

async function cashierWithShortcuts(
  shortcuts: Partial<FakeApiClient['settings']['cashShortcuts']>,
) {
  const api = new FakeApiClient();
  api.settings.cashShortcuts = { ...api.settings.cashShortcuts, ...shortcuts };
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  return api;
}

describe('CashierPage: atalhos de Cadastros (2026-10-15)', () => {
  it('salva pela tecla escolhida (F9) e o Ctrl+Enter deixa de salvar', async () => {
    const api = await cashierWithShortcuts({ save: 'F9' });
    expect(
      screen.getByRole('button', { name: /Salvar pedido/ }),
    ).toHaveTextContent('F9');
    await userEvent.keyboard(ONE_LINE_PAID);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(postedBodies(api, '/orders')).toEqual([]);
    await userEvent.keyboard('{F9}');
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
  });

  it('Shift+Enter como salvar vale até no campo Item, sem pôr o item digitado', async () => {
    const api = await cashierWithShortcuts({ save: 'Shift+Enter' });
    await userEvent.keyboard(ONE_LINE_PAID);
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(postedBodies(api, '/orders')[0]).toMatchObject({
      items: [{ productId: 1, quantity: 1 }],
    });
  });

  it('a tecla do tipo mostrada é a escolhida', async () => {
    await cashierWithShortcuts({ toggleType: 'F7' });
    await userEvent.keyboard('{F7}');
    expect(screen.getByLabelText('Telefone')).toHaveFocus();
    expect(screen.getByText('F7')).toBeInTheDocument();
  });
});

describe('CashierPage: Limpar tudo (2026-10-15)', () => {
  it('o 1º clique pede confirmação; o 2º limpa a comanda e volta ao Qtd', async () => {
    await cashierWithShortcuts({});
    await userEvent.keyboard('{Enter}9{Enter}');
    expect(lineCount()).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: /Limpar tudo/ }));
    expect(lineCount()).toBe(1);
    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar limpeza/ }),
    );
    expect(lineCount()).toBe(0);
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
  });

  it('pelo atalho: F8 duas vezes limpa; outra tecla no meio desarma', async () => {
    await cashierWithShortcuts({});
    await userEvent.keyboard('{Enter}9{Enter}{F8}');
    expect(
      screen.getByRole('button', { name: /Confirmar limpeza/ }),
    ).toBeInTheDocument();
    await userEvent.keyboard('2');
    expect(screen.getByRole('button', { name: /Limpar tudo/ })).toBeVisible();
    await userEvent.keyboard('{Backspace}{F8}{F8}');
    expect(lineCount()).toBe(0);
  });
});
