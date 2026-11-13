import { createCashApi } from '../api/cash-api';
import type { ExpenseInput, OrderInput } from '../api/types';
import type { StaffConsumptionInput } from '../api/staff-consumption-types';
import type { FiadoPaymentInput } from '../api/fiado-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  needsDrawerOpening,
  OPENING_REQUIRED_MESSAGE,
  promptsOpeningOnEntry,
  withOpeningGate,
} from './opening-gate';

describe('needsDrawerOpening', () => {
  it('a noite em andamento aberta e sem troco espera a abertura', () => {
    expect(
      needsDrawerOpening(true, { status: 'OPEN', openingCash: null }),
    ).toBe(true);
  });

  it('não espera com troco gravado, noite fechada ou dia escolhido', () => {
    expect(
      needsDrawerOpening(true, { status: 'OPEN', openingCash: '30.00' }),
    ).toBe(false);
    expect(
      needsDrawerOpening(true, { status: 'CLOSED', openingCash: null }),
    ).toBe(false);
    expect(
      needsDrawerOpening(false, { status: 'OPEN', openingCash: null }),
    ).toBe(false);
  });
});

describe('promptsOpeningOnEntry', () => {
  it('o login caixa recebe o diálogo sozinho a partir das 6h', () => {
    expect(promptsOpeningOnEntry('CAIXA', new Date(2026, 10, 13, 6, 0))).toBe(
      true,
    );
    expect(promptsOpeningOnEntry('CAIXA', new Date(2026, 10, 13, 19))).toBe(
      true,
    );
  });

  it('de madrugada (antes das 6h) não pede a abertura do dia novo', () => {
    expect(promptsOpeningOnEntry('CAIXA', new Date(2026, 10, 14, 0, 36))).toBe(
      false,
    );
    expect(promptsOpeningOnEntry('CAIXA', new Date(2026, 10, 14, 5, 59))).toBe(
      false,
    );
  });

  it('o admin nunca recebe o diálogo sozinho (regressão: consulta de dia, 2026-11-13)', () => {
    expect(promptsOpeningOnEntry('ADMIN', new Date(2026, 10, 13, 14))).toBe(
      false,
    );
    expect(promptsOpeningOnEntry(undefined, new Date(2026, 10, 13, 19))).toBe(
      false,
    );
  });
});

const ORDER = { items: [] } as unknown as OrderInput;
const EXPENSE = { amount: '10.00' } as unknown as ExpenseInput;
const CONSUMPTION = { items: [] } as unknown as StaffConsumptionInput;
const FIADO_PAYMENT = { amount: '5.00' } as unknown as FiadoPaymentInput;

function gatedCash(blocked: boolean) {
  const api = new FakeApiClient();
  const asked: string[] = [];
  const cash = withOpeningGate(createCashApi(api), () => {
    asked.push('ask');
    return blocked;
  });
  return { api, cash, asked };
}

describe('withOpeningGate', () => {
  it('barra pedido, gasto e consumo novos e o recebimento do fiado antes da abertura', async () => {
    const { api, cash, asked } = gatedCash(true);

    await expect(cash.saveOrder(null, ORDER)).rejects.toThrow(
      OPENING_REQUIRED_MESSAGE,
    );
    await expect(cash.saveExpense(null, EXPENSE)).rejects.toThrow(
      OPENING_REQUIRED_MESSAGE,
    );
    await expect(cash.saveStaffConsumption(null, CONSUMPTION)).rejects.toThrow(
      OPENING_REQUIRED_MESSAGE,
    );
    await expect(cash.receiveFiado(7, FIADO_PAYMENT)).rejects.toThrow(
      OPENING_REQUIRED_MESSAGE,
    );
    expect(asked).toHaveLength(4);
    expect(api.calls).toHaveLength(0);
  });

  it('editar o que já existe passa direto, sem perguntar', async () => {
    const { api, cash, asked } = gatedCash(true);

    await cash.saveOrder(7, ORDER).catch(() => undefined);
    await cash.saveExpense(3, EXPENSE).catch(() => undefined);

    expect(asked).toHaveLength(0);
    expect(api.calls.map((call) => call.method)).toEqual(['PUT', 'PUT']);
  });

  it('depois da abertura lança normalmente', async () => {
    const { api, cash } = gatedCash(false);

    await cash.saveOrder(null, ORDER).catch(() => undefined);

    expect(api.calls[0]).toMatchObject({ method: 'POST', path: '/orders' });
  });
});
