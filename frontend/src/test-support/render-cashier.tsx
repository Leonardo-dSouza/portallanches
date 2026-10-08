/** Apoio dos specs da página do Caixa (pedidos e o resto), divididos por tamanho. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { Product } from '../api/types';
import { CashierPage } from '../pages/CashierPage';
import { FakeAuth } from './FakeAuth';
import { FakeApiClient } from './fake-api-client';

const product = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null,
  salePrice: string,
): Product => ({
  id,
  name,
  categoryName,
  categoryId: 1,
  menuNumber,
  salePrice,
  active: true,
  description: null,
  components: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
});

/** Cardápio dos testes da página do Caixa: 9 tradicional e 9 artesanal (mesmo número), e bebidas sem número. */
export const MENU: Product[] = [
  product(1, 'X Salada', 'Tradicional', 9, '17.80'),
  product(2, 'X Salada', 'Artesanal', 9, '25.90'),
  product(5, 'Coca Cola 600ml', 'Refrigerantes', null, '7.00'),
  product(6, 'Coca Cola 2l', 'Refrigerantes', null, '12.00'),
];

export async function renderCashier(api = new FakeApiClient()) {
  if (api.products.length === 0) api.products = MENU;
  render(
    <ApiContext.Provider value={api}>
      <FakeAuth role={api.role}>
        <CashierPage today="2026-09-22" />
      </FakeAuth>
    </ApiContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
  return api;
}

export const type = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
export const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
export const postedBodies = (api: FakeApiClient, path: string) =>
  api.calls
    .filter((c) => c.method === 'POST' && c.path === path)
    .map((c) => c.body);

/** Nome, rua e número da casa (o número é obrigatório na entrega; vazio = não digita). */
export async function fillCustomer(
  name: string,
  street: string,
  houseNumber = '10',
) {
  await type('Nome do cliente', name);
  await type('Rua', street);
  if (houseNumber) await type('Número', houseNumber);
}

/**
 * Lança só pelo teclado, como no fim da noite: itens (cada um com Enter), Enter com o campo
 * vazio vai para o pagamento, a tecla 1 escolhe PIX e Enter salva.
 */
export async function addOrderByKeyboard(items = '9{Enter}') {
  await userEvent.click(screen.getByLabelText('Item'));
  await userEvent.keyboard(`${items}{Enter}1{Enter}`);
}

export const ONE_X_SALADA = [{ productId: 1, quantity: 1 }];

/** Abre o calendário da "Data do caixa" e escolhe o dia pelo nome por extenso. */
export async function pickCashDate(dayLabel: string) {
  await userEvent.click(screen.getByRole('button', { name: /^Data do caixa/ }));
  await userEvent.click(screen.getByRole('button', { name: dayLabel }));
}
