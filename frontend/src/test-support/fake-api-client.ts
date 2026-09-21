import { ApiError, type ApiClient, type HttpMethod } from '../api/api-client';
import type {
  ClosingStatus,
  DeliveryZone,
  Expense,
  ExpenseType,
  Order,
  PaymentMethod,
  PeriodReport,
  UserRole,
} from '../api/types';

interface RecordedCall {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

type Body = Record<string, unknown>;

const DAY_ROUTE = /^\/closings\/(\d{4}-\d{2}-\d{2})\/(close|reopen)$/;
const TODAY = '2026-09-22';

/** API em memória com as rotas do caixa do dia; guarda as chamadas para os testes conferirem. */
export class FakeApiClient implements ApiClient {
  readonly calls: RecordedCall[] = [];
  loginFails = false;
  role: UserRole = 'CAIXA';
  periodReport: PeriodReport | null = null;
  periodFails = false;
  /** Data que o servidor recusa (403), como a janela de 7 dias do caixa. */
  rejectDate: string | null = null;
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
    const [barePath, query = ''] = path.split('?');
    const date = new URLSearchParams(query).get('date');
    if (date !== null && date === this.rejectDate)
      throw new ApiError(
        403,
        'Perfil CAIXA só acessa hoje e os 7 dias anteriores',
      );
    return this.route(method, barePath, (body ?? {}) as Body, date) as T;
  }

  private route(
    method: HttpMethod,
    path: string,
    body: Body,
    date: string | null,
  ): unknown {
    const key = `${method} ${path}`;
    const id = Number(path.split('/')[2]);
    if (key === 'POST /auth/login') return this.login();
    if (key === 'GET /closings/today') return this.closing(date);
    if (key === 'POST /closings/today/close') return this.closeDay();
    if (key === 'GET /closings/today/report') return this.report();
    if (path.startsWith('/reports')) return this.period();
    const dayRoute = DAY_ROUTE.exec(path);
    if (method === 'POST' && dayRoute)
      return this.setDay(dayRoute[1], dayRoute[2]);
    if (path.startsWith('/orders')) return this.orderRoute(method, id, body);
    if (path.startsWith('/expenses'))
      return this.expenseRoute(method, id, body);
    return this.catalogRoute(key, body);
  }

  private login(): unknown {
    if (this.loginFails) throw new ApiError(401, 'Credenciais inválidas');
    return { token: 't1', user: { id: 2, name: 'Maria', role: this.role } };
  }

  private period(): PeriodReport {
    if (this.periodFails) throw new ApiError(500, 'Falha ao gerar o relatório');
    if (!this.periodReport)
      throw new Error('FakeApiClient: defina periodReport');
    return this.periodReport;
  }

  /** Fechar/reabrir por data: atualiza o dia de hoje e a linha do período, se houver. */
  private setDay(date: string, action: string) {
    const status: ClosingStatus = action === 'close' ? 'CLOSED' : 'OPEN';
    if (date === TODAY) this.closingStatus = status;
    this.periodReport?.days.forEach((day) => {
      if (day.businessDate === date) day.status = status;
    });
    return { id: 10, businessDate: date, status };
  }

  private closing(date: string | null = null) {
    return {
      id: 10,
      businessDate: date ?? TODAY,
      status: this.closingStatus,
    };
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
