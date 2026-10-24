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
import {
  assertNameFree,
  fakePaymentFrom,
  reorderedPayments,
  withSavedPayment,
} from './fake-payments';
import { fakeOrderRoute, type FakeOrderStore } from './fake-orders';
import { fakeCategoryRoute } from './fake-categories';
import { fakeMenuForSale, fakeProductFrom } from './fake-products';
import { fakeStreets, fakeStreetZones } from './fake-street-zones';
import { DEFAULT_APP_SETTINGS } from '../settings/app-settings-context';
import { requireFakeManager } from './fake-manager';
import type { OrderEvent } from '../api/order-event-types';
import { fakeDayReport } from './fake-report';
import { FAKE_USERS, fakeUsersRoute } from './fake-users';
import type {
  ExpenseInvoiceDetail,
  InvoicePreview,
} from '../api/invoice-types';
import {
  fakeExpenseInvoiceRoute,
  type FakeExpenseStore,
} from './fake-expense-invoices';
import { fakeExpenseRoute } from './fake-expenses';
import { fakeCatalogWrite } from './fake-catalog-routes';
import { fakeStaffConsumptionRoute } from './fake-staff-consumptions';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { FakePurchaseData, fakePurchaseRoute } from './fake-purchases';

interface RecordedCall {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

type Body = Record<string, unknown>;

const DAY_ROUTE = /^\/closings\/(\d{4}-\d{2}-\d{2})\/(close|reopen)$/;
const DAY_VIEW_ROUTE =
  /^\/closings\/(\d{4}-\d{2}-\d{2})\/(orders|expenses|staff-consumptions|report)$/;
const TODAY = '2026-09-22';

/** API em memória com as rotas do caixa do dia; guarda as chamadas para os testes conferirem. */
export class FakeApiClient
  implements ApiClient, FakeOrderStore, FakeExpenseStore
{
  readonly calls: RecordedCall[] = [];
  loginFails = false;
  role: UserRole = 'CAIXA';
  cancelNeedsManager = false;
  editNeedsManager = false;
  users = structuredClone(FAKE_USERS);
  adminPassword = 'admin123';
  orderEvents: Record<number, OrderEvent[]> = {};
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
    {
      id: 1,
      name: 'PIX',
      active: true,
      sortOrder: 0,
      isCardTerminal: false,
      isCash: false,
    },
    {
      id: 2,
      name: 'Dinheiro',
      active: true,
      sortOrder: 1,
      isCardTerminal: false,
      isCash: true,
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
  settings: AppSettings = structuredClone(DEFAULT_APP_SETTINGS);
  /** O que o backend responde ao gravar pedido: o que o saldo do sistema não cobriu. */
  stockShortfalls: StockShortfall[] = [];
  /** Pedidos gravados na noite em andamento (nascem Em preparo; o caixa imprime). */
  liveOrders = true;
  /** Cardápio do caixa por dia (preço antigo de um caixa atrasado); sem entrada = `products`. */
  saleMenus: Record<string, SaleMenuItem[]> = {};
  stockItems: StockItem[] = [];
  /** Histórico da aba Entrada; o estorno marca `reversedAt`. */
  stockEntries: StockEntryRecord[] = [];
  orders: Order[] = [];
  expenses: Expense[] = [];
  invoicePreviews: Record<string, InvoicePreview | ApiError> = {};
  invoiceDetails: Record<number, ExpenseInvoiceDetail> = {};
  purchases = new FakePurchaseData();
  staffConsumptions: StaffConsumption[] = [];
  /** Resposta do `GET /staff-consumptions/names` (sugestões do "Para quem"). */
  consumerNames: string[] = [];
  private nextId = 100;

  takeId(): number {
    return this.nextId++;
  }

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
      return this.setDay(dayRoute[1], dayRoute[2], body);
    if (path.startsWith('/orders'))
      return fakeOrderRoute(this, method, path, id, body);
    if (path.startsWith('/users'))
      return fakeUsersRoute(this, method, path, body);
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
      return fakeExpenseRoute(this, method, id, body);
    if (path.startsWith('/staff-consumptions'))
      return fakeStaffConsumptionRoute(this, method, path, id, body);
    if (path.startsWith('/expense-invoices'))
      return fakeExpenseInvoiceRoute(this, method, path, body);
    if (path.startsWith('/purchases'))
      return fakePurchaseRoute(this.purchases, method, path, query, body);
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
  private setDay(date: string, action: string, body: unknown) {
    if (action === 'reopen' && this.reopenRefusal)
      throw new ApiError(403, this.reopenRefusal);
    if (action === 'reopen') requireFakeManager(this.role, body);
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
    return fakeDayReport(this);
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

  private catalogRoute(
    method: HttpMethod,
    path: string,
    key: string,
    body: Body,
  ): unknown {
    if (key === 'GET /payment-methods') return this.paymentMethods;
    if (key === 'GET /delivery-zones') return this.zones;
    if (key === 'GET /expense-types') return this.expenseTypes;
    const catalogWrite = fakeCatalogWrite(this, method, path, body);
    if (catalogWrite) return catalogWrite;
    // Antes do PUT por id, como no controller do backend.
    if (key === 'PUT /payment-methods/order')
      return (this.paymentMethods = reorderedPayments(
        this.paymentMethods,
        body.ids as number[],
      ));
    if (method === 'PUT' && path.startsWith('/payment-methods/'))
      return this.updatePayment(Number(path.split('/')[2]), body);
    if (key === 'POST /payment-methods') return this.addPayment(body);
    if (key === 'GET /motoboy-rates') return this.rates;
    if (key === 'POST /motoboy-rates') return this.saveRate(body);
    if (key === 'GET /settings') return this.settings;
    // Parcial como no backend: cada tela manda só o que é dela.
    if (key === 'PUT /settings')
      return (this.settings = { ...this.settings, ...body } as AppSettings);
    return undefined;
  }

  private addPayment(body: Body): PaymentMethod {
    const method = fakePaymentFrom(body, this.nextId++);
    this.paymentMethods = withSavedPayment(this.paymentMethods, method, 'POST');
    return method;
  }

  private updatePayment(id: number, body: Body): PaymentMethod {
    const method = fakePaymentFrom(body, id);
    this.paymentMethods = withSavedPayment(this.paymentMethods, method, 'PUT');
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
}
