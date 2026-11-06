import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import {
  addOrderByKeyboard,
  postedBodies,
  renderCashier,
  type,
} from '../test-support/render-cashier';

function customer(
  id: number,
  name: string,
  street: string,
  phone: string | null = null,
  number = '12',
): Customer {
  return {
    id,
    name,
    phone,
    street,
    number,
    reference: null,
    deliveryZoneId: 1,
  };
}

async function openDelivery(customers: Customer[]) {
  const api = new FakeApiClient();
  api.customers = customers;
  await renderCashier(api);
  await userEvent.click(screen.getByLabelText('Entrega'));
  return api;
}

async function typeNameAndLeave(name: string) {
  await type('Nome do cliente', name);
  await userEvent.tab();
}

describe('CashierPage: cliente pelo nome, sem telefone', () => {
  it('um cliente com o nome preenche rua, bairro e taxa e reaproveita o cadastro', async () => {
    const api = await openDelivery([customer(7, 'João Silva', 'Rua A')]);
    await typeNameAndLeave('joao silva');
    expect(await screen.findByDisplayValue('Rua A')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('João Silva');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Monterrey');
    expect(screen.getByLabelText('Taxa')).toHaveValue('3,00');
    expect(screen.getByText(/Cliente cadastrado/)).toBeInTheDocument();
    await addOrderByKeyboard();
    expect(api.lines).toContain('GET /customers?name=joao%20silva');
    expect(postedBodies(api, '/customers')).toEqual([]);
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: 7 }),
    ]);
  });

  it('homônimos aparecem numa lista com a rua; escolher um preenche', async () => {
    const api = await openDelivery([
      customer(7, 'Ana', 'Rua A'),
      customer(8, 'Ana', 'Rua B', '79999991234', '45'),
    ]);
    await typeNameAndLeave('Ana');
    expect(
      await screen.findByText(/2 clientes com esse nome/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Rua B, 45/ }));
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua B');
    expect(screen.getByLabelText('Número')).toHaveValue('45');
    expect(screen.getByLabelText('Telefone')).toHaveValue('79999991234');
    expect(screen.queryByRole('button', { name: /Rua A/ })).toBeNull();
    await addOrderByKeyboard();
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: 8 }),
    ]);
  });

  it('com telefone digitado não busca pelo nome', async () => {
    const api = await openDelivery([customer(7, 'Ana', 'Rua A')]);
    await type('Telefone', '79988887777');
    await typeNameAndLeave('Ana');
    expect(api.lines.filter((line) => line.includes('name='))).toEqual([]);
    expect(screen.getByText(/Cliente novo: "Ana"/)).toBeInTheDocument();
  });

  it('trocar o nome do cliente achado pelo nome vira cliente novo, sem mexer no outro', async () => {
    const api = await openDelivery([customer(7, 'Ana', 'Rua A')]);
    await typeNameAndLeave('Ana');
    await screen.findByDisplayValue('Rua A');
    await userEvent.clear(screen.getByLabelText('Nome do cliente'));
    await type('Nome do cliente', 'Bia');
    expect(screen.getByText(/Cliente novo: "Bia"/)).toBeInTheDocument();
    await addOrderByKeyboard();
    expect(postedBodies(api, '/customers')).toEqual([
      {
        name: 'Bia',
        phone: null,
        street: 'Rua A',
        number: '12',
        reference: null,
        deliveryZoneId: 1,
      },
    ]);
    expect(api.calls.filter((call) => call.method === 'PUT')).toEqual([]);
  });
});

const putsTo = (api: FakeApiClient, path: string) =>
  api.calls.filter((call) => call.method === 'PUT' && call.path === path);

async function retype(label: string, text: string) {
  await userEvent.clear(screen.getByLabelText(label));
  await type(label, text);
}

const homonymDialog = (name = 'Thiago') =>
  screen.findByRole('dialog', { name: `${name} já está cadastrado` });

/** Achou o Thiago 1 (sem telefone) pelo nome e trocou a rua: o caso do bug. */
async function thiagoWithOtherStreet() {
  const api = await openDelivery([customer(7, 'Thiago', 'Rua A')]);
  await typeNameAndLeave('Thiago');
  await screen.findByDisplayValue('Rua A');
  await retype('Rua', 'Rua B');
  await addOrderByKeyboard();
  return api;
}

describe('CashierPage: homônimo com outro endereço (S5-11)', () => {
  it('pergunta ao salvar; Enter = é outra pessoa: cadastra novo sem mexer no Thiago 1', async () => {
    const api = await thiagoWithOtherStreet();
    const dialog = await homonymDialog();
    expect(dialog).toHaveTextContent('Rua A, 12');
    expect(dialog).toHaveTextContent('Rua B, 12');
    expect(
      within(dialog).getByRole('button', { name: /É outra pessoa/ }),
    ).toHaveFocus();
    expect(postedBodies(api, '/orders')).toEqual([]);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(putsTo(api, '/customers/7')).toEqual([]);
    const created = api.customers.find((c) => c.street === 'Rua B');
    expect(created).toMatchObject({ name: 'Thiago', phone: null });
    expect(created?.id).not.toBe(7);
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: created?.id }),
    ]);
    expect(api.customers.find((c) => c.id === 7)?.street).toBe('Rua A');
  });

  it('tecla 1 = mudou de endereço: atualiza o cadastro, como antes', async () => {
    const api = await thiagoWithOtherStreet();
    await homonymDialog();
    await userEvent.keyboard('1');
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(postedBodies(api, '/customers')).toEqual([]);
    expect(putsTo(api, '/customers/7')).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({ street: 'Rua B' }),
      }),
    ]);
    expect(postedBodies(api, '/orders')).toEqual([
      expect.objectContaining({ customerId: 7 }),
    ]);
  });

  it('fechar a janela volta ao formulário sem salvar nada', async () => {
    const api = await thiagoWithOtherStreet();
    const dialog = await homonymDialog();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Fechar' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(postedBodies(api, '/orders')).toEqual([]);
    expect(api.calls.filter((call) => call.method === 'PUT')).toEqual([]);
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua B');
  });

  it('só a referência mudou: atualiza sem perguntar', async () => {
    const api = await openDelivery([customer(7, 'Thiago', 'Rua A')]);
    await typeNameAndLeave('Thiago');
    await screen.findByDisplayValue('Rua A');
    await type('Referência', 'portão verde');
    await addOrderByKeyboard();
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(putsTo(api, '/customers/7')).toHaveLength(1);
  });

  it('homônimo escolhido com telefone: tecla 2 cadastra outra pessoa sem esse telefone', async () => {
    const api = await openDelivery([
      customer(7, 'Ana', 'Rua A'),
      customer(8, 'Ana', 'Rua B', '79999991234', '45'),
    ]);
    await typeNameAndLeave('Ana');
    await userEvent.click(
      await screen.findByRole('button', { name: /Rua B, 45/ }),
    );
    await retype('Número', '50');
    await addOrderByKeyboard();
    await homonymDialog('Ana');
    await userEvent.keyboard('2');
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(postedBodies(api, '/customers')).toEqual([
      expect.objectContaining({
        name: 'Ana',
        phone: null,
        street: 'Rua B',
        number: '50',
      }),
    ]);
    expect(api.calls.filter((call) => call.method === 'PUT')).toEqual([]);
  });

  it('cadastro sem endereço (fiado do balcão): pergunta com "Mesma pessoa"', async () => {
    const counterOnly = {
      ...customer(7, 'Thiago', 'x'),
      street: null,
      number: null,
      deliveryZoneId: null,
    };
    const api = await openDelivery([counterOnly]);
    await typeNameAndLeave('Thiago');
    await type('Rua', 'Rua C');
    await type('Número', '5');
    await type('Bairro', 'Monterrey');
    await addOrderByKeyboard();
    const dialog = await homonymDialog();
    expect(dialog).toHaveTextContent(/sem endereço/);
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Mesma pessoa/ }),
    );
    await waitFor(() => expect(postedBodies(api, '/orders')).toHaveLength(1));
    expect(putsTo(api, '/customers/7')).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({ street: 'Rua C' }),
      }),
    ]);
  });

  it('na edição do pedido não pergunta: trocar a rua atualiza o cadastro', async () => {
    const api = new FakeApiClient();
    api.customers = [customer(7, 'Thiago', 'Rua A')];
    api.orders = [
      orderFixture({
        id: 5,
        dayNumber: 5,
        type: 'DELIVERY',
        amount: '20.80',
        deliveryZoneId: 1,
        customerId: 7,
        customerName: 'Thiago',
        customerStreet: 'Rua A',
        customerNumber: '12',
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
      }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );
    await retype('Rua', 'Rua B');
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar alterações/ }),
    );
    await waitFor(() => expect(putsTo(api, '/customers/7')).toHaveLength(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(postedBodies(api, '/customers')).toEqual([]);
  });
});
