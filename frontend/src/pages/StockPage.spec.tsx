import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { StockItem, Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
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

async function renderStock(api = fakeApi()) {
  render(
    <ApiContext.Provider value={api}>
      <StockPage today="2026-09-25" />
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
