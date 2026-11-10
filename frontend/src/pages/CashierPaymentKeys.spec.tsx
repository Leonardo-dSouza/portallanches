import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PaymentKeyLayout, PaymentMethod } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { renderCashier } from '../test-support/render-cashier';

// A pagar e Dividir no lugar de Cadastros → Pagamentos (2026-11-10): número fixo da posição,
// letras 0 e D ainda valem, desligado some.

const method = (id: number, name: string): PaymentMethod => ({
  id,
  name,
  active: true,
  sortOrder: id,
  isCardTerminal: false,
  isCash: name === 'Dinheiro',
  isFiado: false,
});

async function setupCashier(paymentKeyLayout: PaymentKeyLayout) {
  const api = new FakeApiClient();
  api.paymentMethods = [
    method(1, 'Dinheiro'),
    method(2, 'PIX'),
    method(3, 'Ton'),
  ];
  api.settings = { ...api.settings, paymentKeyLayout };
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  return api;
}

// Até o pagamento: Qtd → Item 9 → Enter vazio vai às formas.
const TO_PAYMENT = '{Enter}9{Enter}{Enter}{Enter}';
const splitPanel = () =>
  screen.queryByRole('group', { name: 'Pagamento dividido' });

describe('CashierPage: lugar do A pagar e do Dividir (2026-11-10)', () => {
  it('Dividir na 3ª posição: tecla 3 abre o painel e o Ton vira 4', async () => {
    await setupCashier({
      openAccount: { position: 98, active: true },
      split: { position: 2, active: true },
    });
    const dividir = screen.getByLabelText('Dividir').closest('label')!;
    expect(dividir).toHaveTextContent('3');
    expect(screen.getByLabelText('Ton').closest('label')).toHaveTextContent(
      '4',
    );
    await userEvent.keyboard(`${TO_PAYMENT}3`);
    expect(splitPanel()).toBeInTheDocument();
  });

  it('na entrega o número do A pagar fica vago e as outras teclas não mudam', async () => {
    await setupCashier({
      openAccount: { position: 1, active: true },
      split: { position: 99, active: true },
    });
    expect(screen.getByLabelText('PIX').closest('label')).toHaveTextContent(
      '3',
    );
    await userEvent.click(screen.getByLabelText('Entrega'));
    expect(screen.queryByLabelText('A pagar')).toBeNull();
    expect(screen.getByLabelText('PIX').closest('label')).toHaveTextContent(
      '3',
    );
  });

  it('A pagar desligado some do balcão e a tecla 0 não faz nada', async () => {
    await setupCashier({
      openAccount: { position: 98, active: false },
      split: { position: 99, active: true },
    });
    expect(screen.queryByLabelText('A pagar')).toBeNull();
    await userEvent.keyboard(`${TO_PAYMENT}0`);
    expect(screen.getByLabelText('Nome')).not.toHaveFocus();
    await userEvent.keyboard('d');
    expect(splitPanel()).toBeInTheDocument();
  });
});
