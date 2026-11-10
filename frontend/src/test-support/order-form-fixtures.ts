import type { Customer, DeliveryZone, PaymentMethod } from '../api/types';
import { FIADO_METHOD } from './fake-fiado';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  type OrderFormValues,
} from '../cash/order-form-values';
import type { DraftLine } from '../cash/order-lines';

export const DINHEIRO: PaymentMethod = {
  id: 1,
  name: 'Dinheiro',
  active: true,
  sortOrder: 1,
  isCardTerminal: false,
  isCash: true,
  isFiado: false,
};

export const PIX: PaymentMethod = {
  id: 2,
  name: 'PIX',
  active: true,
  sortOrder: 2,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
};

export const ZONES: DeliveryZone[] = [
  {
    id: 1,
    neighborhood: 'Monterrey',
    neighborhoodKey: 'monterrey',
    fee: '3.00',
    active: true,
  },
  {
    id: 2,
    neighborhood: 'Velho',
    neighborhoodKey: 'velho',
    fee: '2.00',
    active: false,
  },
];

export const METHODS = [DINHEIRO, PIX, FIADO_METHOD];

export const form = (overrides: Partial<OrderFormValues>): OrderFormValues => ({
  ...EMPTY_ORDER_FORM,
  paymentMethodId: '1',
  ...overrides,
});

export const TWO_X_SALADA: DraftLine[] = [
  {
    id: 1,
    productId: 1,
    name: 'X Salada',
    menuNumber: 9,
    categoryName: 'Tradicional',
    unitPrice: '17.80',
    quantity: 2,
    note: '',
    choice: null,
    addons: [],
    removals: [],
  },
];

export const ITEMS = [{ productId: 1, quantity: 2 }];

/** Os testes variam o formulário; as linhas são sempre 2 X Salada. */
export const build = (
  values: OrderFormValues,
  zones: DeliveryZone[],
  known: Customer | null,
) => buildOrderRequest(values, TWO_X_SALADA, zones, known, METHODS);

/** Entrega com cliente preenchido; os testes variam bairro e taxa. */
export const delivery = (
  overrides: Partial<OrderFormValues>,
): OrderFormValues =>
  form({
    type: 'DELIVERY',
    customerName: 'Ana',
    street: 'Rua A',
    houseNumber: '123',
    ...overrides,
  });

export const NO_CUSTOMER_ORDER = {
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerStreet: null,
  customerNumber: null,
  customerReference: null,
  fiadoDueDate: null,
  fiado: null,
  diningOption: null,
  dayNumber: 1,
  status: 'DELIVERED' as const,
  createdAt: '2026-09-22T23:00:00Z',
  statusChangedAt: '2026-09-22T23:00:00Z',
  canceledAt: null,
  cancelReason: null,
  changeFor: null,
  paymentParts: [],
};
