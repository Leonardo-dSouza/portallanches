import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { StockItem, Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  FakeSelectionStorage,
  FakeTextExport,
} from '../test-support/fake-stock-export';
import { StockPage } from './StockPage';

const NO_FLAGS = {
  expired: false,
  expiringSoon: false,
  belowMin: false,
  needsPurchase: false,
};

const stockItem = (
  supplyId: number,
  name: string,
  overrides: Partial<StockItem> = {},
): StockItem => ({
  supplyId,
  name,
  countUnit: 'un',
  minStock: null,
  quantity: '10',
  lots: [],
  nextExpiry: null,
  lastCount: null,
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
) {
  render(
    <ApiContext.Provider value={api}>
      <StockPage
        today="2026-09-25"
        selectionStorage={storage}
        textExport={textExport}
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
    expect(rows).toHaveLength(3);
    expect(screen.queryByText('Calabresa fatiada')).not.toBeInTheDocument();
  });
});

describe('StockPage: entrada', () => {
  it('lança fardos com validade e mostra a conversão', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await userEvent.selectOptions(
      screen.getByLabelText('Insumo'),
      'iT Laranja 2L',
    );
    await type('Quantidade', '2');
    await userEvent.selectOptions(screen.getByLabelText('Em'), 'fardo');
    expect(screen.getByText('Soma 12 un ao estoque.')).toBeInTheDocument();
    await type('Validade (opcional)', '2026-10-15');
    await click('Lançar entrada');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Entrada lançada: 12 un de iT Laranja 2L.',
    );
    expect(postedTo(api, '/stock/entries')).toEqual([
      {
        supplyId: 1,
        amount: '2',
        packageName: 'fardo',
        expiresOn: '2026-10-15',
      },
    ]);
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
