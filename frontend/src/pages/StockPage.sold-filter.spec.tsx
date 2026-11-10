import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  FakeSelectionStorage,
  FakeTextExport,
} from '../test-support/fake-stock-export';
import {
  FakeMenuFilterStorage,
  NO_FLAGS,
  renderStock,
  stockItem,
} from '../test-support/render-stock-page';

beforeEach(() => {
  localStorage.clear();
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
