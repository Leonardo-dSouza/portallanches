import { ApiError, type ApiClient, type HttpMethod } from '../api/api-client';
import type {
  ClosingStatus,
  DeliveryZone,
  Expense,
  ExpenseType,
  Order,
  PaymentMethod,
} from '../api/types';

interface RecordedCall {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

type Body = Record<string, unknown>;

/** API em memória com as rotas do caixa do dia; guarda as chamadas para os testes conferirem. */
export class FakeApiClient implements ApiClient {
  readonly calls: RecordedCall[] = [];
  loginFails = false;
  closingStatus: ClosingStatus = 'OPEN';
  paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'PIX', active: true, sortOrder: 0 },
    { id: 2, name: 'Dinheiro', active: true, sortOrder: 1 },
  ];
  zones: DeliveryZone[] = [
    {
      id: 1,
      neighborhood: 'Monterrey',
      neighborhoodKey: 'monterrey',
      fee: '3.00',
      active: true,
    },
  ];
  expenseTypes: ExpenseType[] = [
    { id: 1, name: 'Gás', nameKey: 'gas', active: true },
  ];
  orders: Order[] = [];
  expenses: Expense[] = [];
  private nextId = 100;

  get lines(): string[] {
    return this.calls.map((call) => `${call.method} ${call.path}`);
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    this.calls.push({ method, path, body });
    return this.route(method, path, (body ?? {}) as Body) as T;
  }

  private route(method: HttpMethod, path: string, body: Body): unknown {
    const key = `${method} ${path}`;
    const id = Number(path.split('/')[2]);
    if (key === 'POST /auth/login') return this.login();
    if (key === 'GET /closings/today') return this.closing();
    if (key === 'POST /closings/today/close') return this.closeDay();
    if (key === 'GET /closings/today/report') return this.report();
    if (path.startsWith('/orders')) return this.orderRoute(method, id, body);
    if (path.startsWith('/expenses'))
      return this.expenseRoute(method, id, body);
    return this.catalogRoute(key, body);
  }

  private login(): unknown {
    if (this.loginFails) throw new ApiError(401, 'Credenciais inválidas');
    return { token: 't1', user: { id: 2, name: 'Maria', role: 'CAIXA' } };
  }

  private closing() {
    return { id: 10, businessDate: '2026-09-22', status: this.closingStatus };
  }

  private closeDay() {
    this.closingStatus = 'CLOSED';
    return this.closing();
  }

  private report() {
    const total = this.orders.reduce((sum, o) => sum + Number(o.amount), 0);
    return {
      businessDate: '2026-09-22',
      status: this.closingStatus,
      orders: { count: this.orders.length, total: total.toFixed(2) },
      byPaymentMethod: [],
      delivery: { count: 0, feesTotal: '0.00' },
      motoboy: { dailyRate: '40.00', deliveryFees: '0.00', totalCost: '40.00' },
      expenses: { count: this.expenses.length, total: '0.00' },
    };
  }

  private orderRoute(method: HttpMethod, id: number, body: Body): unknown {
    if (method === 'GET') return this.orders;
    if (method === 'DELETE') {
      this.orders = this.orders.filter((o) => o.id !== id);
      return undefined;
    }
    const fee = String(
      body.deliveryFee ??
        this.zones.find((z) => z.id === body.deliveryZoneId)?.fee ??
        '0.00',
    );
    const order = {
      id: method === 'PUT' ? id : this.nextId++,
      deliveryZoneId: null,
      ...body,
      deliveryFee: fee,
    } as Order;
    this.orders =
      method === 'PUT'
        ? this.orders.map((o) => (o.id === id ? order : o))
        : [...this.orders, order];
    return order;
  }

  private expenseRoute(method: HttpMethod, id: number, body: Body): unknown {
    if (method === 'GET') return this.expenses;
    if (method === 'DELETE') {
      this.expenses = this.expenses.filter((e) => e.id !== id);
      return undefined;
    }
    const expense = {
      id: method === 'PUT' ? id : this.nextId++,
      description: null,
      ...body,
    } as Expense;
    this.expenses =
      method === 'PUT'
        ? this.expenses.map((e) => (e.id === id ? expense : e))
        : [...this.expenses, expense];
    return expense;
  }

  private catalogRoute(key: string, body: Body): unknown {
    if (key === 'GET /payment-methods') return this.paymentMethods;
    if (key === 'GET /delivery-zones') return this.zones;
    if (key === 'GET /expense-types') return this.expenseTypes;
    if (key === 'POST /delivery-zones') return this.addZone(body);
    if (key === 'POST /expense-types') return this.addType(body);
    return undefined;
  }

  private addZone(body: Body): DeliveryZone {
    const neighborhood = String(body.neighborhood);
    const zone = {
      id: this.nextId++,
      neighborhood,
      neighborhoodKey: neighborhood.toLowerCase(),
      fee: String(body.fee),
      active: true,
    };
    this.zones = [...this.zones, zone];
    return zone;
  }

  private addType(body: Body): ExpenseType {
    const name = String(body.name);
    const type = {
      id: this.nextId++,
      name,
      nameKey: name.toLowerCase(),
      active: true,
    };
    this.expenseTypes = [...this.expenseTypes, type];
    return type;
  }
}
