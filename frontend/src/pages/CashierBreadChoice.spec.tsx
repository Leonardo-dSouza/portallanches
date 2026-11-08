import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { BREAD_MENU } from '../test-support/order-menu';
import { postedBodies, renderCashier } from '../test-support/render-cashier';

/** O caixa com o artesanal (9.) que exige o pão e os três pães (2026-11-08). */
function renderWithBread() {
  const api = new FakeApiClient();
  api.saleMenus = { hoje: BREAD_MENU };
  return renderCashier(api);
}

const typeInItem = async (keys: string) => {
  await userEvent.click(screen.getByLabelText('Item'));
  await userEvent.keyboard(keys);
};

const orderLines = () => screen.getByRole('list', { name: 'Itens do pedido' });

describe('CashierPage: pão obrigatório do artesanal', () => {
  it('a pergunta abre ao lançar o artesanal; a tecla 2 escolhe o Brioche e ele sai no pedido', async () => {
    const api = await renderWithBread();
    await typeInItem('9.{Enter}');
    const prompt = screen.getByRole('listbox', {
      name: 'Escolha o pão do X Salada',
    });
    expect(
      within(prompt)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['1Pão Gergelim', '2Pão Brioche', '3Pão Tradicional']);
    await userEvent.keyboard('2');
    expect(within(orderLines()).getByText('Pão Brioche')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}{Enter}1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: [{ productId: 2, quantity: 1, choiceProductId: 67 }],
        type: 'COUNTER',
        paymentMethodId: 1,
      },
    ]);
  });

  it('Esc deixa pendente em vermelho; seguir sem o pão reabre a pergunta e não salva', async () => {
    const api = await renderWithBread();
    await typeInItem('9.{Enter}{Escape}');
    expect(within(orderLines()).getByText('Escolha o pão')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('{Enter}');
    expect(
      screen.getByText('Escolha o pão do X Salada antes de seguir'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listbox', { name: 'Escolha o pão do X Salada' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('1');
    expect(within(orderLines()).getByText('Pão Gergelim')).toBeInTheDocument();
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('o tradicional não pergunta, e o pão não aparece na busca', async () => {
    await renderWithBread();
    await typeInItem('9{Enter}');
    expect(
      screen.queryByRole('listbox', { name: /Escolha o pão/ }),
    ).not.toBeInTheDocument();
    await typeInItem('pão');
    expect(screen.getByText('Nenhum item com "pão"')).toBeInTheDocument();
  });

  it('o painel do item troca o pão', async () => {
    await renderWithBread();
    await typeInItem('9.{Enter}3');
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Adicionais, retiradas e observação de X Salada',
      }),
    );
    const panel = screen.getByRole('dialog', {
      name: 'Adicionais e retiradas de X Salada',
    });
    expect(
      within(panel).getByRole('button', { name: /Pão Tradicional/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(
      within(panel).getByRole('button', { name: /Pão Gergelim/ }),
    );
    expect(
      within(orderLines()).getByText('Pão Gergelim', {
        selector: '.order-line-choice',
      }),
    ).toBeInTheDocument();
  });

  it('o consumo interno também exige o pão antes de salvar', async () => {
    const api = await renderWithBread();
    await userEvent.click(screen.getByRole('tab', { name: 'Consumo' }));
    await userEvent.type(screen.getByLabelText('Para quem'), 'Bianca{Enter}');
    await userEvent.keyboard('{Enter}9.{Enter}{Escape}{Enter}{Enter}');
    expect(postedBodies(api, '/staff-consumptions')).toEqual([]);
    expect(
      screen.getByText('Escolha o pão do X Salada antes de seguir'),
    ).toBeInTheDocument();
    await userEvent.keyboard('2{Enter}{Enter}');
    expect(postedBodies(api, '/staff-consumptions')).toEqual([
      {
        consumerName: 'Bianca',
        items: [{ productId: 2, quantity: 1, choiceProductId: 67 }],
      },
    ]);
  });
});
