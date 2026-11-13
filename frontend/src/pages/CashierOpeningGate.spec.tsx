import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  click,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

// Hotfix 2026-11-13: o diálogo fecha com "Agora não", mas lançar antes do troco inicial o traz
// de volta ("antes disso não se lança nada", card 7). O admin não recebe o diálogo sozinho.
describe('CashierPage: lançar antes de abrir o caixa', () => {
  it('o gasto novo é barrado, o diálogo volta e, aberto o caixa, o gasto sai', async () => {
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.openingCash = null;
    await renderCashier(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await type('Tipo', 'gás');
    await type('Valor', '120');
    await click('Adicionar gasto');

    const dialog = await screen.findByRole('dialog', { name: 'Abrir o caixa' });
    expect(
      screen.getByText(/Abra o caixa antes de lançar/),
    ).toBeInTheDocument();
    expect(postedBodies(api, '/expenses')).toEqual([]);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Abrir o caixa' }),
    );
    await screen.findByRole('button', { name: 'Adicionar gasto' });
    await click('Adicionar gasto');

    expect(await screen.findByText('R$ 120,00')).toBeInTheDocument();
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '120.00', expenseTypeId: 1 },
    ]);
  });
});
