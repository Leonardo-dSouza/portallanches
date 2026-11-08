import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type HttpMethod } from '../api/api-client';
import { createCashApi } from '../api/cash-api';
import type { Customer, DeliveryZone } from '../api/types';
import type { MenuItem } from './menu-lookup';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeReceiptPrinter } from '../test-support/fake-receipt-printer';
import { postedBodies } from '../test-support/render-cashier';
import { useOrderForm } from './use-order-form';

const ITEM: MenuItem = {
  id: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryId: 1,
  categoryName: 'Tradicional',
  addonCategoryId: null,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '17.80',
  stockLeft: null,
  removables: [],
};

const ZONE: DeliveryZone = {
  id: 1,
  neighborhood: 'Monterrey',
  neighborhoodKey: 'monterrey',
  fee: '3.00',
  active: true,
};

class ErroringApiClient extends FakeApiClient {
  failNextSaveOrder = false;

  override async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.failNextSaveOrder && method === 'POST' && path === '/orders') {
      this.failNextSaveOrder = false;
      throw new ApiError(500, 'Falha simulada na API');
    }
    return super.request(method, path, body);
  }
}

function renderOrderForm(api: FakeApiClient = new FakeApiClient()) {
  const cash = createCashApi(api);
  const onSaved = vi.fn();
  const hook = renderHook(() =>
    useOrderForm({
      cash,
      zones: [ZONE],
      methods: api.paymentMethods,
      menu: [ITEM],
      editing: null,
      onSaved,
      focus: { entry: { current: null }, phone: { current: null } },
      printer: new FakeReceiptPrinter(),
      autoPrint: false,
    }),
  );
  return { ...hook, api, onSaved };
}

function fillDeliveryForm(form: ReturnType<typeof useOrderForm>) {
  form.items.pick(ITEM);
  form.setField('type', 'DELIVERY');
  form.setField('paymentMethodId', '1');
  form.setField('customerName', 'Maria Santos');
  form.setField('phone', '79999991234');
  form.setField('neighborhood', 'Monterrey');
  form.setField('street', 'Rua Central');
  form.setField('houseNumber', '100');
}

describe('useOrderForm: envio duplo do pedido (regressão)', () => {
  it('dois submits seguidos sem esperar gravam um pedido e um cliente', async () => {
    const { result, api, onSaved } = renderOrderForm();
    act(() => {
      fillDeliveryForm(result.current);
    });

    await act(async () => {
      const first = result.current.submit();
      const second = result.current.submit();
      await Promise.all([first, second]);
    });

    expect(postedBodies(api, '/customers')).toHaveLength(1);
    expect(postedBodies(api, '/orders')).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });

  it('depois de um erro da API, salvar de novo funciona', async () => {
    const api = new ErroringApiClient();
    api.failNextSaveOrder = true;
    const { result, onSaved } = renderOrderForm(api);
    act(() => {
      fillDeliveryForm(result.current);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe('Falha simulada na API');
    expect(result.current.saving).toBe(false);
    expect(postedBodies(api, '/orders')).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(postedBodies(api, '/orders')).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('solta a trava na janela do homônimo e retoma o salvar com a resposta', async () => {
    const api = new FakeApiClient();
    const existing: Customer = {
      id: 15,
      name: 'Carlos Lima',
      phone: '79988887777',
      street: 'Rua Velha',
      number: '1',
      reference: null,
      deliveryZoneId: 1,
    };
    api.customers = [existing];
    const { result, onSaved } = renderOrderForm(api);

    act(() => {
      result.current.items.pick(ITEM);
      result.current.setField('type', 'DELIVERY');
      result.current.setField('paymentMethodId', '1');
      result.current.setField('customerName', 'Carlos Lima');
    });

    await act(async () => {
      await result.current.lookupName();
    });

    act(() => {
      result.current.setField('street', 'Rua Nova');
      result.current.setField('houseNumber', '99');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.homonym.view).not.toBeNull();
    expect(result.current.saving).toBe(false);
    expect(postedBodies(api, '/orders')).toHaveLength(0);

    await act(async () => {
      result.current.homonym.answer('same');
    });

    expect(postedBodies(api, '/orders')).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });
});
