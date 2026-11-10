import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FakeSelectionStorage,
  FakeTextExport,
} from '../test-support/fake-stock-export';
import {
  clickStockButton as click,
  fakeApi,
  renderStock,
} from '../test-support/render-stock-page';

beforeEach(() => {
  localStorage.clear();
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
