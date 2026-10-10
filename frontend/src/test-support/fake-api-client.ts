import type { AnalyticsReport } from '../api/analytics-types';
import { ApiError, type ApiClient, type HttpMethod } from '../api/api-client';
import type {
  AppSettings,
  ClosingStatus,
  Customer,
  DeliveryZone,
  Expense,
  ExpenseType,
  MotoboyRate,
  StockEntryRecord,
  StockItem,
  Supply,
  SupplySection,
  Order,
  PaymentMethod,
  PaymentMethodTotal,
  PeriodReport,
  Product,
  ProductCategory,
  ProductInput,
  SaleMenuItem,
  StockShortfall,
  UserRole,
} from '../api/types';
import { searchFakeCustomers } from './fake-customer-search';
import { fakeDayView } from './fake-day-view';
import { savedInto } from './fake-lists';
import { assertNameFree, fakePaymentFrom } from './fake-payments';
import { fakeOrderFrom } from './fake-orders';
import { fakeCategoryRoute } from './fake-categories';
import { fakeMenuForSale, fakeProductFrom } from './fake-products';
import { fakeStreets, fakeStreetZones } from './fake-street-zones';

interface RecordedCall {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

type Body = Record<string, unknown>;

const DAY_ROUTE = /^\/closings\/(\d{4}-\d{2}-\d{2})\/(close|reopen)$/;
const DAY_VIEW_ROUTE =
  /^\/closings\/(\d{4}-\d{2}-\d{2})\/(orders|expenses|report)$/;
const TODAY = '2026-09-22';

/** API em memória com as rotas do caixa do dia; guarda as chamadas para os testes conferirem. */
export class FakeApiClient implements ApiClient {
  readonly calls: RecordedCall[] = [];
  loginFails = false;
  role: UserRole = 'CAIXA';
  periodReport: PeriodReport | null = null;
  /** Dias sem fechamento: a visão do dia (`/closings/:data/...`) responde 404. */
  daysWithoutClosing: string[] = [];
  /** Resposta do `GET /analytics`; null = a API falha (500). */
  analyticsReport: AnalyticsReport | null = null;
  periodFails = false;
  /** Data que o servidor recusa (403), como a janela de 7 dias do caixa. */
  rejectDate: string | null = null;
  closingStatus: ClosingStatus = 'OPEN';
  /** Mensagem do 403 ao reabrir (ex.: caixa num dia que não é o último); null = reabre. */
  reopenRefusal: string | null = null;
  paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'PIX', active: true, sortOrder: 0, isCardTerminal: false },
    {
      id: 2,
      name: 'Dinheiro',
      active: true,
      sortOrder: 1,
      isCardTerminal: false,
    },
  ];
  /** `byPaymentMethod` do relatório do dia (o fake não soma por forma). */
  reportPayments: PaymentMethodTotal[] = [];
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
  rates: MotoboyRate[] = [];
  customers: Customer[] = [];
  supplies: Supply[] = [];
  supplySections: SupplySection[] = [
    { id: 1, name: 'Geladeira', sortOrder: 1, active: true },
    { id: 3, name: 'Refrigerantes', sortOrder: 3, active: true },
  ];
  productCategories: ProductCategory[] = [
    {
      id: 1,
      name: 'Tradicional',
      sortOrder: 1,
      active: true,
      importLocked: true,
      addonCategoryId: null,
    },
    {
      id: 2,
      name: 'Artesanal',
      sortOrder: 2,
      active: true,
      importLocked: true,
      addonCategoryId: null,
    },
  ];
  products: Product[] = [];
  settings: AppSettings = { lowStockWarning: 6 };
  /** O que o backend responde ao gravar pedido: o que o saldo do sistema não cobriu. */
  stockShortfalls: StockShortfall[] = [];
  /** Cardápio do caixa por dia (preço antigo de um caixa atrasado); sem entrada = `products`. */
  saleMenus: Record<string, SaleMenuItem[]> = {};
  stockItems: StockItem[] = [];
  /** Histórico da aba Entrada; o estorno marca `reversedAt`. */
  stockEntries: StockEntryRecord[] = [];
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
    return this.route(method, barePath, (body ?? {}) as Body, query) as T;
  }

  private route(
    method: HttpMethod,
    path: string,
    body: Body,
    query: string,
  ): unknown {
    const key = `${method} ${path}`;
    const date = new URLSearchParams(query).get('date');
    const id = Number(path.split('/')[2]);
    if (key === 'POST /auth/login') return this.login();
    if (key === 'GET /closings/today') return this.closing(date);
    if (key === 'POST /closings/today/close') return this.closeDay();
    if (key === 'GET /closings/today/report') return this.report();
    if (path.startsWith('/reports')) return this.period();
    if (path === '/analytics') return this.analytics();
    const dayView = DAY_VIEW_ROUTE.exec(path);
    if (method === 'GET' && dayView)
      return fakeDayView(this, dayView[1], dayView[2]);
    const dayRoute = DAY_ROUTE.exec(path);
    if (method === 'POST' && dayRoute)
      return this.setDay(dayRoute[1], dayRoute[2]);
    if (path.startsWith('/orders')) return this.orderRoute(method, id, body);
    if (path === '/customers/streets')
      return fakeStreets(this.customers, query);
    if (path === '/customers/street-zones')
      return fakeStreetZones(this.customers);
    if (key === 'GET /supplies/sections') return this.supplySections;
    if (path.startsWith('/supplies')) return this.supplyRoute(method, id, body);
    if (path.startsWith('/product-categories'))
      return this.categoryRoute(method, path, body);
    if (key === 'GET /products/for-sale')
      return fakeMenuForSale(
        this.products,
        this.saleMenus,
        date,
        this.productCategories,
      );
    if (path.startsWith('/products'))
      return this.productRoute(method, id, body);
    // Estoque: só devolve a situação configurada; entradas e contagens ficam em `calls`.
    if (key === 'GET /stock') return this.stockItems;
    if (key === 'GET /stock/entries') return this.stockEntries;
    if (key === 'POST /stock/entries') return body.items;
    const reversal = /^\/stock\/entries\/(\d+)\/reversal$/.exec(path);
    if (method === 'POST' && reversal)
      return this.reverseEntry(Number(reversal[1]));
    if (key === 'POST /stock/counts') return undefined;
    if (path.startsWith('/customers'))
      return this.customerRoute(method, id, body, query);
    if (path.startsWith('/expenses'))
      return this.expenseRoute(method, id, body);
    return this.catalogRoute(method, path, key, body);
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

  private analytics(): AnalyticsReport {
    if (this.analyticsReport) return this.analyticsReport;
    throw new ApiError(500, 'Falha ao gerar a análise');
  }

  /** Fechar/reabrir por data: atualiza o dia de hoje e a linha do período, se houver. */
  private setDay(date: string, action: string) {
    if (action === 'reopen' && this.reopenRefusal)
      throw new ApiError(403, this.reopenRefusal);
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

  /** Relatório do dia (o fake não soma por forma; `reportPayments` define as formas). */
  report() {
    const total = this.orders.reduce((sum, o) => sum + Number(o.amount), 0);
    return {
      businessDate: '2026-09-22',
      status: this.closingStatus,
      orders: { count: this.orders.length, total: total.toFixed(2) },
      byPaymentMethod: this.reportPayments,
      withoutPaymentMethod: { count: 0, total: '0.00' },
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
    const order = fakeOrderFrom(
      body,
      method === 'PUT' ? id : this.nextId++,
      this,
    );
    this.orders = savedInto(this.orders, order, method);
    return { ...order, stockShortfalls: this.stockShortfalls };
  }

  private reverseEntry(lotId: number): undefined {
    this.stockEntries = this.stockEntries.map((entry) =>
      entry.lotId === lotId
        ? { ...entry, reversible: false, reversedAt: '2026-09-25T23:00:00Z' }
        : entry,
    );
    return undefined;
  }

  /** Insumos: lista, cadastro (nome repetido → 409) e edição, como `/supplies`. */
  private supplyRoute(method: HttpMethod, id: number, body: Body): unknown {
    if (method === 'GET') return this.supplies;
    const others = this.supplies.filter((s) => s.id !== id);
    assertNameFree(
      others.map((s) => s.name),
      String(body.name),
    );
    const supply = {
      ...(body as unknown as Omit<Supply, 'id'>),
      id: method === 'PUT' ? id : this.nextId++,
    };
    this.supplies = savedInto(this.supplies, supply, method);
    return supply;
  }

  /** Categorias: lista, criação, edição e ordem (`fake-categories.ts`, como o backend). */
  private categoryRoute(method: HttpMethod, path: string, body: Body): unknown {
    const result = fakeCategoryRoute(
      this.productCategories,
      method,
      path,
      body,
    );
    this.productCategories = result.categories;
    return result.response;
  }

  /** Lanches: lista e gravação (`fakeProductFrom` junta categoria e insumos como o backend). */
  private productRoute(method: HttpMethod, id: number, body: Body): unknown {
    if (method === 'GET') return this.products;
    const productId = method === 'PUT' ? id : this.nextId++;
    const input = body as unknown as ProductInput;
    const { productCategories: categories, supplies, products } = this;
    const product = fakeProductFrom(
      input,
      productId,
      categories,
      supplies,
      products,
    );
    this.products = [
      ...this.products.filter((p) => p.id !== product.id),
      product,
    ];
    return product;
  }

  /** Busca (telefone ou nome), cadastro e atualização, como `/customers` do backend. */
  private customerRoute(
    method: HttpMethod,
    id: number,
    body: Body,
    query: string,
  ): unknown {
    if (method === 'GET') return searchFakeCustomers(this.customers, query);
    const customer = {
      ...(body as unknown as Omit<Customer, 'id'>),
      id: method === 'PUT' ? id : this.nextId++,
    };
    this.customers =
      method === 'PUT'
        ? this.customers.map((c) => (c.id === id ? customer : c))
        : [...this.customers, customer];
    return customer;
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

  private catalogRoute(
    method: HttpMethod,
    path: string,
    key: string,
    body: Body,
  ): unknown {
    if (key === 'GET /payment-methods') return this.paymentMethods;
    if (key === 'GET /delivery-zones') return this.zones;
    if (key === 'GET /expense-types') return this.expenseTypes;
    if (method === 'PUT' && path.startsWith('/delivery-zones/'))
      return this.updateZone(Number(path.split('/')[2]), body);
    if (method === 'PUT' && path.startsWith('/expense-types/'))
      return this.updateType(Number(path.split('/')[2]), body);
    if (method === 'PUT' && path.startsWith('/payment-methods/'))
      return this.updatePayment(Number(path.split('/')[2]), body);
    if (key === 'POST /payment-methods') return this.addPayment(body);
    if (key === 'GET /motoboy-rates') return this.rates;
    if (key === 'POST /motoboy-rates') return this.saveRate(body);
    if (key === 'POST /delivery-zones') return this.addZone(body);
    if (key === 'POST /expense-types') return this.addType(body);
    if (key === 'GET /settings') return this.settings;
    if (key === 'PUT /settings')
      return (this.settings = body as unknown as AppSettings);
    return undefined;
  }

  private updateZone(id: number, body: Body): DeliveryZone {
    const neighborhood = String(body.neighborhood);
    assertNameFree(
      this.zones.filter((z) => z.id !== id).map((z) => z.neighborhood),
      neighborhood,
    );
    const zone = {
      ...this.zones.find((z) => z.id === id)!,
      neighborhood,
      neighborhoodKey: neighborhood.toLowerCase(),
      fee: String(body.fee),
      active: Boolean(body.active),
    };
    this.zones = this.zones.map((z) => (z.id === id ? zone : z));
    return zone;
  }

  private updateType(id: number, body: Body): ExpenseType {
    const name = String(body.name);
    assertNameFree(
      this.expenseTypes.filter((t) => t.id !== id).map((t) => t.name),
      name,
    );
    const type = {
      ...this.expenseTypes.find((t) => t.id === id)!,
      name,
      nameKey: name.toLowerCase(),
      active: Boolean(body.active),
    };
    this.expenseTypes = this.expenseTypes.map((t) => (t.id === id ? type : t));
    return type;
  }

  private addPayment(body: Body): PaymentMethod {
    assertNameFree(
      this.paymentMethods.map((m) => m.name),
      String(body.name),
    );
    const method = fakePaymentFrom(body, this.nextId++);
    this.paymentMethods = [...this.paymentMethods, method];
    return method;
  }

  private updatePayment(id: number, body: Body): PaymentMethod {
    const others = this.paymentMethods.filter((m) => m.id !== id);
    assertNameFree(
      others.map((m) => m.name),
      String(body.name),
    );
    const method = fakePaymentFrom(body, id);
    this.paymentMethods = savedInto(this.paymentMethods, method, 'PUT');
    return method;
  }

  /** Grupo + data repetidos trocam o valor da linha (como o backend). */
  private saveRate(body: Body): MotoboyRate {
    const dayGroup = body.dayGroup as MotoboyRate['dayGroup'];
    const effectiveFrom = String(body.effectiveFrom);
    const existing = this.rates.find(
      (r) => r.dayGroup === dayGroup && r.effectiveFrom === effectiveFrom,
    );
    const rate = {
      id: existing?.id ?? this.nextId++,
      dayGroup,
      amount: String(body.amount),
      effectiveFrom,
      createdById: 1,
    };
    this.rates = existing
      ? this.rates.map((r) => (r === existing ? rate : r))
      : [...this.rates, rate];
    return rate;
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
