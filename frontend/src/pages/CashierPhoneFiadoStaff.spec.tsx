import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FiadoDebtor, FiadoOrderView, FiadoStatement } from '../api/fiado-types';
import { PHONE_QUERY } from '../cash/use-phone-layout';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import { FakeMediaQueryList } from '../test-support/fake-media-query';
import { renderCashier } from '../test-support/render-cashier';

const OPEN_ORDER: FiadoOrderView = {
  orderId: 50,
  businessDate: '2026-09-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '50.00',
  paidTotal: '3.00',
  remaining: '47.00',
  dueDate: '2026-09-21',
};

const MARIA: FiadoDebtor = {
  customerId: 15,
  name: 'Maria',
  phone: '79999991234',
  openTotal: '47.00',
  orders: [OPEN_ORDER],
};

const STATEMENT: FiadoStatement = {
  customer: { id: 15, name: 'Maria', phone: '79999991234' },
  openTotal: '47.00',
  openOrders: [OPEN_ORDER],
  paidOrders: [],
  payments: [],
};

function apiWithFiado(): FakeApiClient {
  const api = new FakeApiClient();
  api.paymentMethods = [...api.paymentMethods, FIADO_METHOD];
  api.fiado.debtors = [MARIA];
  api.fiado.statements = { 15: STATEMENT };
  return api;
}

describe('Celular (2026-11-05): extrato do fiado ao tocar no cliente e consumo sem foco automático', () => {
  let originalMatchMedia: typeof window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Fiado: rolagem suave até o extrato ao tocar no cliente', () => {
    it('no celular, tocar no cliente chama scrollIntoView para descer até o extrato', async () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = (query: string) =>
        new FakeMediaQueryList(query, query === PHONE_QUERY);

      const scrollMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollMock;

      await renderCashier(apiWithFiado());
      await userEvent.click(screen.getByRole('tab', { name: /^Fiado/ }));
      await userEvent.click(screen.getByRole('button', { name: /^Maria/ }));

      await waitFor(() => {
        expect(scrollMock).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });

    it('no desktop, tocar no cliente seleciona sem disparar scrollIntoView', async () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = (query: string) =>
        new FakeMediaQueryList(query, false);

      const scrollMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollMock;

      await renderCashier(apiWithFiado());
      await userEvent.click(screen.getByRole('tab', { name: /^Fiado/ }));
      await userEvent.click(screen.getByRole('button', { name: /^Maria/ }));

      await screen.findByRole('heading', { name: 'Em aberto' });
      expect(scrollMock).not.toHaveBeenCalled();
    });
  });

  describe('Consumo interno: ausência de foco automático no celular', () => {
    it('no celular, o campo Para quem não ganha foco ao abrir a aba para prevenir abertura do teclado', async () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = (query: string) =>
        new FakeMediaQueryList(query, query === PHONE_QUERY);

      await renderCashier(new FakeApiClient());
      await userEvent.click(screen.getByRole('tab', { name: 'Consumo' }));

      const nameInput = screen.getByLabelText('Para quem');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).not.toHaveFocus();
    });

    it('no desktop, o campo Para quem recebe foco automaticamente na abertura da aba', async () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = (query: string) =>
        new FakeMediaQueryList(query, false);

      await renderCashier(new FakeApiClient());
      await userEvent.click(screen.getByRole('tab', { name: 'Consumo' }));

      const nameInput = screen.getByLabelText('Para quem');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveFocus();
    });
  });
});
