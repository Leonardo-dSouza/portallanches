import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PaymentMethod, Product } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import {
  click,
  postedBodies,
  renderCashier,
} from '../test-support/render-cashier';

const method = (
  id: number,
  name: string,
  isCardTerminal = false,
): PaymentMethod => ({
  id,
  name,
  active: true,
  sortOrder: id,
  isCardTerminal,
  isCash: name === 'Dinheiro',
  isFiado: false,
});

const METHODS = [
  method(1, 'Dinheiro'),
  method(2, 'PIX'),
  method(3, 'Maquininha Ton', true),
];

const product = (
  id: number,
  name: string,
  menuNumber: number | null,
  salePrice: string,
): Product => ({
  id,
  name,
  categoryName: 'Lanches',
  categoryId: 1,
  menuNumber,
  salePrice,
  active: true,
  description: null,
  components: [],
  bundleItems: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
});

const PRODUCTS = [
  product(1, 'X Salada', 9, '50.00'),
  product(2, 'Refrigerante', 8, '10.00'),
];

async function setupCashier() {
  const api = new FakeApiClient();
  api.paymentMethods = METHODS;
  api.products = PRODUCTS;
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  return api;
}

// Até o pagamento: Qtd → Item 9 (X Salada R$ 50,00) → Enter vazio vai às formas.
const TO_PAYMENT = '{Enter}9{Enter}{Enter}{Enter}';
const panel = () => screen.queryByRole('group', { name: 'Pagamento dividido' });

describe('CashierPage: pagamento dividido (card 2, 2026-11-08)', () => {
  it('tecla D abre o painel com a falta total e o foco na forma da 1ª parte', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d`);
    expect(panel()).toBeInTheDocument();
    expect(screen.getByText('Dividir R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('Falta R$ 50,00')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Dinheiro parte 1')).toHaveFocus(),
    );
  });

  it('só teclado: PIX 20 → Enter abre a 2ª com 30,00 → Dinheiro → Enter salva', async () => {
    const api = await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d2`);
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 1')).toHaveFocus(),
    );
    await userEvent.keyboard('20,00{Enter}');
    expect(screen.getByLabelText('Valor parte 2')).toHaveValue('30,00');
    await waitFor(() =>
      expect(screen.getByLabelText('Dinheiro parte 2')).toHaveFocus(),
    );
    await userEvent.keyboard('1');
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 2')).toHaveFocus(),
    );
    // O balcão não tem "Troco para" (a API recusa): só a entrega e o Receber mostram.
    expect(screen.queryByLabelText('Troco para')).toBeNull();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(postedBodies(api, '/orders')).toEqual([
        {
          items: [{ productId: 1, quantity: 1 }],
          type: 'COUNTER',
          diningOption: 'TAKEAWAY',
          paymentParts: [
            { paymentMethodId: 2, amount: '20.00' },
            { paymentMethodId: 1, amount: '30.00' },
          ],
        },
      ]),
    );
    expect(await screen.findByText('Pago · dividido')).toBeInTheDocument();
  });

  it('a forma já escolhida vira a 1ª parte e o foco vai direto ao Valor', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}2d`);
    expect(screen.getByLabelText('PIX parte 1')).toBeChecked();
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 1')).toHaveFocus(),
    );
  });

  it('Esc fecha o painel, volta para uma forma e devolve o foco às formas', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d`);
    expect(panel()).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(panel()).toBeNull();
    expect(screen.getByLabelText('Dividir')).not.toBeChecked();
    expect(screen.getByLabelText('Dinheiro')).toHaveFocus();
  });

  it('Dinheiro em duas partes mostra o erro e não salva', async () => {
    const api = await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d1`);
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 1')).toHaveFocus(),
    );
    await userEvent.keyboard('20,00{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Dinheiro parte 2')).toHaveFocus(),
    );
    await userEvent.keyboard('1');
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 2')).toHaveFocus(),
    );
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O Dinheiro entra numa parte só (some os valores)',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('Receber do A pagar dividido salva com paymentParts', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = METHODS;
    api.orders = [
      orderFixture({
        id: 15,
        dayNumber: 15,
        customerName: 'Carlos',
        amount: '50.00',
        status: 'DELIVERED',
        type: 'COUNTER',
        paymentMethodId: null,
      }),
    ];
    await renderCashier(api);
    await screen.findByText('Carlos');
    const row = screen.getByRole('row', { name: /Carlos/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Receber' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText('Dividir'));
    await userEvent.click(within(dialog).getByLabelText('PIX parte 1'));
    await userEvent.type(
      within(dialog).getByLabelText('Valor parte 1'),
      '20,00{Enter}',
    );
    await userEvent.click(within(dialog).getByLabelText('Dinheiro parte 2'));
    // No Receber do A pagar o troco existe (como na forma única): vale contra a parte em dinheiro.
    await userEvent.type(within(dialog).getByLabelText('Troco para'), '50,00');
    expect(within(dialog).getByText('(levar R$ 20,00)')).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Receber pagamento' }),
    );
    const calls = api.calls.filter((c) => c.path === '/orders/15/payment');
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({
      paymentParts: [
        { paymentMethodId: 2, amount: '20.00' },
        { paymentMethodId: 1, amount: '30.00' },
      ],
      changeFor: '50.00',
    });
  });

  it('+ Item em pedido dividido pergunta forma do acréscimo e soma na parte', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = METHODS;
    api.products = PRODUCTS;
    api.orders = [
      orderFixture({
        id: 25,
        dayNumber: 25,
        amount: '50.00',
        status: 'DELIVERED',
        type: 'COUNTER',
        paymentMethodId: 2,
        paymentParts: [
          { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
          { paymentMethodId: 1, paymentMode: null, amount: '30.00' },
        ],
        items: [storedItem(storedLine('X Salada', 'Lanches', 1, '50.00'))],
      }),
    ];
    await renderCashier(api);
    await click('Adicionar item');
    expect(
      screen.getByRole('heading', { name: /^Acrescentar ao #25/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('8{Enter}');
    expect(screen.getByText('Acréscimo R$ 10,00 pago em:')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Salvar/ }));
    const putCalls = api.calls.filter(
      (c) => c.method === 'PUT' && c.path === '/orders/25',
    );
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].body).toMatchObject({
      paymentParts: [
        { paymentMethodId: 2, amount: '20.00' },
        { paymentMethodId: 1, amount: '40.00' },
      ],
    });
    expect(
      (putCalls[0].body as Record<string, unknown>).paymentMethodId,
    ).toBeUndefined();
  });
});

describe('CashierPage: Dividir mais claro (2026-11-10)', () => {
  it('a tecla Adicionar forma abre a próxima linha com o que falta e o selo fica Fechou', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d2`);
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 1')).toHaveFocus(),
    );
    await userEvent.keyboard('20,00');
    expect(screen.getByText('Falta R$ 30,00')).toHaveAttribute(
      'data-tone',
      'short',
    );
    await click('Adicionar forma');
    expect(screen.getByLabelText('Valor parte 2')).toHaveValue('30,00');
    expect(screen.getByText('Fechou')).toHaveAttribute('data-tone', 'ok');
  });

  it('o aviso da linha aparece só depois que o foco sai dela', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d`);
    expect(screen.queryByText('Escolha a forma')).toBeNull();
    await click('Adicionar forma');
    expect(within(panel()!).getAllByText('Escolha a forma')).toHaveLength(1);
  });

  it('lista e pop-up mostram quanto foi em cada forma', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = METHODS;
    api.orders = [
      orderFixture({
        id: 30,
        dayNumber: 30,
        customerName: 'Bia',
        amount: '50.00',
        status: 'DELIVERED',
        type: 'COUNTER',
        paymentMethodId: 2,
        paymentParts: [
          { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
          { paymentMethodId: 1, paymentMode: null, amount: '30.00' },
        ],
        items: [storedItem(storedLine('X Salada', 'Lanches', 1, '50.00'))],
      }),
    ];
    await renderCashier(api);
    await screen.findByText('Bia');
    const row = screen.getByRole('row', { name: /Bia/ });
    expect(within(row).getByText('PIX R$ 20,00')).toBeInTheDocument();
    expect(within(row).getByText('Dinheiro R$ 30,00')).toBeInTheDocument();
    await userEvent.click(within(row).getByText('Bia'));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Pagamento', { selector: 'dt' })
        .nextElementSibling,
    ).toHaveTextContent('Dividido');
    expect(
      within(dialog).getByText('PIX', { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent('R$ 20,00');
    expect(
      within(dialog).getByText('Dinheiro', { selector: 'dt' })
        .nextElementSibling,
    ).toHaveTextContent('R$ 30,00');
  });

  it('Tirar uma de duas partes volta para a forma única da que ficou', async () => {
    await setupCashier();
    await userEvent.keyboard(`${TO_PAYMENT}d2`);
    await waitFor(() =>
      expect(screen.getByLabelText('Valor parte 1')).toHaveFocus(),
    );
    await userEvent.keyboard('20,00{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Dinheiro parte 2')).toHaveFocus(),
    );
    await userEvent.keyboard('1');
    await click('Tirar parte 1');
    expect(panel()).toBeNull();
    expect(screen.getByRole('radio', { name: 'Dinheiro' })).toBeChecked();
  });
});
