import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
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
    expect(screen.getByLabelText('Taxa de entrega')).toHaveValue('3,00');
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
