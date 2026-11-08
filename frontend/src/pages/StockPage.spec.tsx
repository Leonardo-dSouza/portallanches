import { beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { StockEntryRecord, StockItem, Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  FakeSelectionStorage,
  FakeTextExport,
} from '../test-support/fake-stock-export';
import {
  type MenuFilterStorage,
  type StockTabWithMenuFilter,
} from '../stock/menu-filter-storage';
import { StockPage } from './StockPage';

class FakeMenuFilterStorage implements MenuFilterStorage {
  readonly saved: { tab: StockTabWithMenuFilter; soldInMenuOnly: boolean }[] =
    [];
  private readonly choices = new Map<StockTabWithMenuFilter, boolean>();

  constructor(initial?: Partial<Record<StockTabWithMenuFilter, boolean>>) {
    if (initial?.status !== undefined)
      this.choices.set('status', initial.status);
    if (initial?.count !== undefined) this.choices.set('count', initial.count);
  }

  load(tab: StockTabWithMenuFilter): boolean | null {
    return this.choices.get(tab) ?? null;
  }

  save(tab: StockTabWithMenuFilter, soldInMenuOnly: boolean): void {
    this.saved.push({ tab, soldInMenuOnly });
    this.choices.set(tab, soldInMenuOnly);
  }
}

const NO_FLAGS = {
  expired: false,
  expiringSoon: false,
  belowMin: false,
  needsPurchase: false,
  countDue: false,
  oversold: false,
};

const stockItem = (
  supplyId: number,
  name: string,
  overrides: Partial<StockItem> = {},
): StockItem => ({
  supplyId,
  name,
  sectionId: null,
  countUnit: 'un',
  minStock: null,
  dailyCount: false,
  soldInMenu: true,
  quantity: '10',
  lots: [],
  nextExpiry: null,
  lastCount: null,
  oversold: null,
  flags: NO_FLAGS,
  ...overrides,
});

const supply = (
  id: number,
  name: string,
  packages: Supply['packages'] = [],
): Supply => ({
  id,
  name,
  countUnit: 'un',
  minStock: null,
  unitCost: null,
  deductOnSale: true,
  dailyCount: false,
  sectionId: null,
  saleProduct: null,
  active: true,
  packages,
});

function fakeApi() {
  const api = new FakeApiClient();
  api.supplies = [
    supply(1, 'iT Laranja 2L', [{ name: 'fardo', quantity: '6' }]),
    supply(2, 'Leite condensado'),
    supply(3, 'Calabresa fatiada'),
  ];
  api.stockItems = [
    stockItem(1, 'iT Laranja 2L', {
      nextExpiry: '2026-09-26',
      flags: { ...NO_FLAGS, expiringSoon: true },
    }),
    stockItem(2, 'Leite condensado', {
      quantity: '2',
      minStock: '4',
      flags: { ...NO_FLAGS, belowMin: true },
    }),
    stockItem(3, 'Calabresa fatiada'),
  ];
  return api;
}

async function renderStock(
  api = fakeApi(),
  storage = new FakeSelectionStorage(),
  textExport = new FakeTextExport(),
  menuFilterStorage = new FakeMenuFilterStorage(),
) {
  render(
    <ApiContext.Provider value={api}>
      <StockPage
        today="2026-09-25"
        selectionStorage={storage}
        textExport={textExport}
        menuFilterStorage={menuFilterStorage}
      />
    </ApiContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Estoque' });
  return api;
}

const type = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
const postedTo = (api: FakeApiClient, path: string) =>
  api.calls
    .filter((c) => c.method === 'POST' && c.path === path)
    .map((c) => c.body);

beforeEach(() => {
  localStorage.clear();
});

describe('StockPage: situação', () => {
  it('mostra saldo e alertas; filtro deixa só quem precisa de atenção', async () => {
    await renderStock();
    expect(
      screen.getByText('2 de 3 insumos precisam de atenção.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Vence amanhã')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do mínimo (4 un)')).toBeInTheDocument();
    await userEvent.click(
      screen.getByLabelText('Só os que precisam de atenção'),
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    // Cabeçalho + título "Sem seção" + os 2 que precisam de atenção.
    expect(rows).toHaveLength(4);
    expect(screen.queryByText('Calabresa fatiada')).not.toBeInTheDocument();
  });

  it('diário sem contagem hoje aparece com "Contar hoje"', async () => {
    const api = fakeApi();
    api.stockItems[2] = stockItem(3, 'Calabresa fatiada', {
      dailyCount: true,
      flags: { ...NO_FLAGS, countDue: true },
    });
    await renderStock(api);
    expect(screen.getByText('Contar hoje')).toBeInTheDocument();
    expect(
      screen.getByText('3 de 3 insumos precisam de atenção.'),
    ).toBeInTheDocument();
  });

  it('sem alerta, a linha fica sem selo (o "Em dia" de 0 e nunca contado confundia)', async () => {
    await renderStock(fakeApi());
    expect(screen.queryByText('Em dia')).toBeNull();
  });

  it('ao clicar na linha de um insumo abre suas movimentações e permite filtrar', async () => {
    const api = fakeApi();
    api.stockMovementsReports.set(1, {
      supply: { id: 1, name: 'iT Laranja 2L', countUnit: 'un' },
      totals: { entered: '12', sold: '2', adjusted: '0' },
      movements: [
        {
          id: 1,
          kind: 'ENTRY',
          kindLabel: 'Entrada',
          quantity: '12',
          balanceAfter: '12',
          origin: null,
          createdByName: 'Admin',
          createdAt: '2026-09-20T10:00:00.000Z',
        },
        {
          id: 2,
          kind: 'SALE',
          kindLabel: 'Venda',
          quantity: '-2',
          balanceAfter: '10',
          origin: 'Pedido #5 de 25/09',
          createdByName: 'Caixa',
          createdAt: '2026-09-25T20:00:00.000Z',
        },
      ],
    });

    await renderStock(api);
    await userEvent.click(screen.getByText('iT Laranja 2L'));

    const dialog = await screen.findByRole('dialog', {
      name: 'Movimentações: iT Laranja 2L',
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Pedido #5 de 25/09')).toBeInTheDocument();

    const select = within(dialog).getByLabelText('Tipo');
    await userEvent.selectOptions(select, 'SALE');

    expect(within(dialog).getByText('Pedido #5 de 25/09')).toBeInTheDocument();
    const table = within(dialog).getByRole('table');
    expect(within(table).queryByText('Entrada')).toBeNull();
  });
});

const ENTRY: StockEntryRecord = {
  lotId: 7,
  supplyId: 2,
  supplyName: 'Leite condensado',
  countUnit: 'un',
  quantity: '12',
  remaining: '12',
  expiresOn: null,
  unitCost: '5.5',
  createdByName: 'caixa',
  createdAt: '2026-09-25T15:00:00Z',
  reversedAt: null,
  reversible: true,
};

describe('StockPage: entrada', () => {
  it('lança a compra inteira de uma vez, só com as linhas digitadas', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await type('Quantidade de iT Laranja 2L', '2');
    await userEvent.selectOptions(
      screen.getByLabelText('Unidade de iT Laranja 2L'),
      'fardo',
    );
    expect(screen.getByText('+ 12 un')).toBeInTheDocument();
    // Validade no calendário do app (2026-10-11): abre em setembro (hoje), vai a outubro.
    await userEvent.click(
      screen.getByRole('button', { name: /^Validade de iT Laranja 2L/ }),
    );
    await click('Próximo mês');
    await click('quinta, 15 de outubro de 2026');
    await type('Valor pago por iT Laranja 2L', '25');
    await userEvent.selectOptions(
      screen.getByLabelText('Valor pago de iT Laranja 2L é'),
      'por fardo',
    );
    await type('Quantidade de Leite condensado', '3');
    await click('Lançar compra (2)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Compra lançada: 2 insumos.',
    );
    expect(postedTo(api, '/stock/entries')).toEqual([
      {
        items: [
          {
            supplyId: 1,
            amount: '2',
            packageName: 'fardo',
            expiresOn: '2026-10-15',
            paid: '25.00',
            paidPer: 'unit',
          },
          {
            supplyId: 2,
            amount: '3',
            packageName: null,
            expiresOn: null,
            paid: null,
            paidPer: 'total',
          },
        ],
      },
    ]);
  });

  it('erro na linha mostra o insumo e não chama a API', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await type('Valor pago por Leite condensado', '10');
    await click('Lançar compra (1)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Leite condensado: quantidade inválida',
    );
    expect(postedTo(api, '/stock/entries')).toEqual([]);
  });

  it('desfaz uma entrada do histórico em dois cliques', async () => {
    const api = fakeApi();
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await screen.findByRole('button', {
      name: 'Desfazer entrada de Leite condensado',
    });
    await click('Desfazer entrada de Leite condensado');
    expect(postedTo(api, '/stock/entries/7/reversal')).toEqual([]);
    await click('Confirmar: desfazer entrada de Leite condensado');
    expect(await screen.findByText('Desfeita')).toBeInTheDocument();
    expect(postedTo(api, '/stock/entries/7/reversal')).toHaveLength(1);
  });

  // Regressão de 2026-10-25: o caixa via o custo pago de cada entrada.
  it('o caixa vê o histórico sem a coluna do custo pago', async () => {
    const api = fakeApi();
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await screen.findByRole('button', {
      name: 'Desfazer entrada de Leite condensado',
    });
    expect(
      screen.queryByRole('columnheader', { name: 'Custo pago' }),
    ).toBeNull();
    expect(screen.queryByText('R$ 5,50 / un')).toBeNull();
  });

  it('o admin vê o custo pago de cada entrada', async () => {
    const api = fakeApi();
    api.role = 'ADMIN';
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    expect(
      await screen.findByRole('columnheader', { name: 'Custo pago' }),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 5,50 / un')).toBeInTheDocument();
  });
});

describe('StockPage: contagem', () => {
  it('envia só as linhas preenchidas, com número ou marca', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await type('Contagem de iT Laranja 2L', '8');
    await click('Precisa comprar: Calabresa fatiada');
    expect(
      screen.getByRole('button', { name: 'Salvar contagem (2)' }),
    ).toBeInTheDocument();
    await click('Salvar contagem (2)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Contagem salva: 2 insumos.',
    );
    expect(postedTo(api, '/stock/counts')).toEqual([
      {
        items: [
          { supplyId: 1, status: 'COUNTED', quantity: '8' },
          { supplyId: 3, status: 'NEEDS_PURCHASE' },
        ],
      },
    ]);
  });

  it('"Contagem do dia" mostra só os diários e guarda o que já foi digitado', async () => {
    const api = fakeApi();
    api.stockItems[2] = stockItem(3, 'Calabresa fatiada', { dailyCount: true });
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await type('Contagem de iT Laranja 2L', '8');
    const daily = screen.getByRole('button', { name: /Contagem do dia/ });
    await userEvent.click(daily);
    expect(daily).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByLabelText('Contagem de Calabresa fatiada'),
    ).toBeVisible();
    expect(
      screen.queryByLabelText('Contagem de iT Laranja 2L'),
    ).not.toBeInTheDocument();
    await userEvent.click(daily);
    expect(screen.getByLabelText('Contagem de iT Laranja 2L')).toHaveValue('8');
  });

  it('sem nada preenchido avisa e não chama a API', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await click('Salvar contagem');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'pelo menos um insumo',
    );
    expect(postedTo(api, '/stock/counts')).toEqual([]);
  });
});

describe('StockPage: lista de compras', () => {
  const listText = () =>
    (screen.getByLabelText('Texto da lista de compras') as HTMLTextAreaElement)
      .value;

  it('começa com os que precisam de atenção e copia o texto', async () => {
    const textExport = new FakeTextExport();
    await renderStock(fakeApi(), new FakeSelectionStorage(), textExport);
    await userEvent.click(
      screen.getByRole('tab', { name: 'Lista de compras' }),
    );
    expect(listText()).toContain('- iT Laranja 2L: 10 un (vence 26/09)');
    expect(listText()).toContain('- Leite condensado: 2 un (mínimo 4 un)');
    expect(listText()).not.toContain('Calabresa');
    await click('Copiar lista');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Lista copiada.',
    );
    expect(textExport.copied).toEqual([listText()]);
  });

  it('lembra a escolha e baixa o .txt com a data', async () => {
    const storage = new FakeSelectionStorage([3]);
    const textExport = new FakeTextExport();
    await renderStock(fakeApi(), storage, textExport);
    await userEvent.click(
      screen.getByRole('tab', { name: 'Lista de compras' }),
    );
    expect(listText()).toContain('- Calabresa fatiada: 10 un');
    await userEvent.click(screen.getByLabelText(/Leite condensado/));
    expect(storage.saved).toEqual([3, 2]);
    await click('Baixar .txt');
    expect(textExport.downloads).toEqual([
      { filename: 'lista-de-compras-2026-09-25.txt', text: listText() },
    ]);
  });

  it('"Nenhum" esvazia e desliga os botões; cópia falha mostra o caminho manual', async () => {
    const textExport = new FakeTextExport();
    textExport.copyWorks = false;
    await renderStock(fakeApi(), new FakeSelectionStorage(), textExport);
    await userEvent.click(
      screen.getByRole('tab', { name: 'Lista de compras' }),
    );
    await click('Copiar lista');
    expect(await screen.findByRole('status')).toHaveTextContent('Ctrl+C');
    await click('Nenhum');
    expect(screen.getByRole('button', { name: 'Copiar lista' })).toBeDisabled();
    expect(listText()).toMatch(/Marque ao menos um insumo/);
  });
});

describe('StockPage: filtro Baixa na venda e Todos (2026-11-08)', () => {
  function apiWithMenuFilter() {
    const api = new FakeApiClient();
    api.supplySections = [
      { id: 1, name: 'Bebidas', sortOrder: 1, active: true },
      { id: 2, name: 'Limpeza', sortOrder: 2, active: true },
    ];
    api.stockItems = [
      stockItem(1, 'iT Laranja 2L', {
        sectionId: 1,
        soldInMenu: true,
        dailyCount: false,
      }),
      stockItem(2, 'Detergente', {
        sectionId: 2,
        soldInMenu: false,
        dailyCount: false,
      }),
      stockItem(3, 'Tomate', {
        sectionId: null,
        soldInMenu: false,
        dailyCount: true,
      }),
    ];
    return api;
  }

  it('inicia com "Baixa na venda" ligado por padrão na Situação e esconde o que não baixa na venda', async () => {
    await renderStock(apiWithMenuFilter());

    const btnBaixa = screen.getByRole('button', { name: 'Baixa na venda' });
    const btnTodos = screen.getByRole('button', { name: 'Todos' });

    expect(btnBaixa).toHaveAttribute('aria-pressed', 'true');
    expect(btnTodos).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByText('iT Laranja 2L')).toBeInTheDocument();
    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.queryByText('Detergente')).not.toBeInTheDocument();
  });

  it('o botão "Todos" na Situação revela os demais insumos', async () => {
    await renderStock(apiWithMenuFilter());

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));

    expect(
      screen.getByRole('button', { name: 'Baixa na venda' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    expect(screen.getByText('Detergente')).toBeInTheDocument();
  });

  it('alerta crítico fura o filtro na Situação mesmo sem baixa na venda nem contagem diária', async () => {
    const api = apiWithMenuFilter();
    api.stockItems.push(
      stockItem(4, 'Guardanapo', {
        sectionId: 2,
        soldInMenu: false,
        dailyCount: false,
        minStock: '5',
        quantity: '2',
        flags: { ...NO_FLAGS, belowMin: true },
      }),
    );

    await renderStock(api);

    // Guardanapo tem alerta belowMin, portanto fura o filtro
    expect(screen.getByText('Guardanapo')).toBeInTheDocument();
    // Detergente não tem alerta nem baixa na venda, continua escondido
    expect(screen.queryByText('Detergente')).not.toBeInTheDocument();
  });

  it('na Contagem inicia com "Baixa na venda" e o botão "Todos" revela o resto', async () => {
    await renderStock(apiWithMenuFilter());

    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));

    const btnBaixa = screen.getByRole('button', { name: 'Baixa na venda' });
    const btnTodos = screen.getByRole('button', { name: 'Todos' });
    expect(btnBaixa).toHaveAttribute('aria-pressed', 'true');
    expect(btnTodos).toHaveAttribute('aria-pressed', 'false');

    // "Contagem do dia" permanece no extra
    expect(
      screen.getByRole('button', { name: /Contagem do dia/ }),
    ).toBeInTheDocument();

    // Detergente escondido com "Baixa na venda"
    expect(screen.queryByText('Detergente')).not.toBeInTheDocument();

    // Clica em "Todos"
    await userEvent.click(btnTodos);
    expect(btnTodos).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Detergente')).toBeInTheDocument();
  });

  it('lembra a escolha por aba no storage e persiste ao trocar', async () => {
    const storage = new FakeMenuFilterStorage({ status: false, count: true });
    await renderStock(
      apiWithMenuFilter(),
      new FakeSelectionStorage(),
      new FakeTextExport(),
      storage,
    );

    // Situação abre com "Todos" conforme salvo no storage
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Baixa na venda' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // Alterna para Baixa na venda e confere que gravou
    await userEvent.click(
      screen.getByRole('button', { name: 'Baixa na venda' }),
    );
    expect(storage.saved).toContainEqual({
      tab: 'status',
      soldInMenuOnly: true,
    });

    // Aba Contagem estava salva como true (Baixa na venda)
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    expect(
      screen.getByRole('button', { name: 'Baixa na venda' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Ao clicar em Todos na Contagem, persiste no storage
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(storage.saved).toContainEqual({
      tab: 'count',
      soldInMenuOnly: false,
    });
  });

  it('as contagens das seções (chips) seguem o filtro', async () => {
    await renderStock(apiWithMenuFilter());

    // Seção Limpeza tem só o Detergente (soldInMenu: false). Com "Baixa na venda", fica com 0
    // Na faixa de chips, "Todas" reflete os 2 visíveis (iT Laranja e Tomate)
    const chipTodas = screen.getByRole('button', { name: /^Todas/ });
    expect(chipTodas).toHaveTextContent('2');

    // Ao ligar "Todos", a seção Limpeza passa a contar 1 e "Todas" conta 3
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: /^Todas/ })).toHaveTextContent(
      '3',
    );
    expect(screen.getByRole('button', { name: /^Limpeza/ })).toHaveTextContent(
      '1',
    );
  });
});
