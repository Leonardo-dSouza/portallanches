import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { CostDraft } from './use-cost-draft';
import { createDefaultCostSheet } from '../test-support/fake-cost-routes';
import { FakeApiClient } from '../test-support/fake-api-client';
import { SuppliesCostTab } from './SuppliesCostTab';
import { createEmptyCostChanges } from './cost-draft';

function createMockDraft(overrides: Partial<CostDraft> = {}): CostDraft {
  const sheet = createDefaultCostSheet();
  return {
    sheet,
    changes: createEmptyCostChanges(),
    preview: null,
    changeCount: 0,
    setBasePrice: vi.fn(),
    setRecipe: vi.fn(),
    removeRecipe: vi.fn(),
    setComponents: vi.fn(),
    setSalePrice: vi.fn(),
    discard: vi.fn(),
    save: vi.fn(),
    saving: false,
    conflict: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  };
}

describe('SuppliesCostTab', () => {
  it('agrupa insumos por seção do estoque e lista em ordem', async () => {
    const client = new FakeApiClient();
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    // Seções Geladeira (id 1) e Refrigerantes (id 3) mais "Sem seção" (Hambúrguer artesanal)
    expect(await screen.findByText('Geladeira')).toBeInTheDocument();
    expect(screen.getByText('Refrigerantes')).toBeInTheDocument();
    expect(screen.getByText('Sem seção')).toBeInTheDocument();
    expect(screen.getByText('Acém')).toBeInTheDocument();
  });

  it('digitar 45,00 no acém chama setBasePrice com "45.00"', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    const input = await screen.findByLabelText(/preço base do acém/i);
    await user.clear(input);
    await user.type(input, '45,00');

    expect(draft.setBasePrice).toHaveBeenCalledWith(
      expect.objectContaining({
        supplyId: 1,
        basePrice: '45.00',
      }),
    );
  });

  it('trocar a embalagem muda baseQuantity e baseLabel', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    const sheet = createDefaultCostSheet();
    // Adiciona embalagem alternativa ao Acém
    sheet.snapshot.supplies[0].packages = [
      { name: 'kg', quantity: '1' },
      { name: 'peça', quantity: '5' },
    ];
    const draft = createMockDraft({ sheet });

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={sheet} draft={draft} />
      </ApiContext.Provider>,
    );

    const select = await screen.findByLabelText(/embalagem de compra do acém/i);
    await user.selectOptions(select, 'peça');

    expect(draft.setBasePrice).toHaveBeenCalledWith(
      expect.objectContaining({
        supplyId: 1,
        baseQuantity: '5',
        baseLabel: 'peça',
      }),
    );
  });

  it('insumo produzido mostra "ficha" sem campo editável', async () => {
    const client = new FakeApiClient();
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByText('Hambúrguer artesanal carne'),
    ).toBeInTheDocument();
    expect(screen.getByText('ficha de produção')).toBeInTheDocument();

    // Não deve existir campo de preço base para o hambúrguer produzido
    expect(
      screen.queryByLabelText(/preço base do hambúrguer artesanal/i),
    ).toBeNull();
    expect(screen.getByText('ficha')).toBeInTheDocument();
  });

  it('filtra pelo campo de busca por nome', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Acém')).toBeInTheDocument();
    const searchInput = screen.getByLabelText(/buscar insumo/i);
    await user.type(searchInput, 'pão');

    expect(screen.getByText('Pão de hambúrguer')).toBeInTheDocument();
    expect(screen.queryByText('Acém')).toBeNull();
  });

  it('"Só os mudados" filtra apenas os insumos com alteração', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    const draft = createMockDraft({
      changes: {
        ...createEmptyCostChanges(),
        basePrices: [
          {
            supplyId: 1,
            basePrice: '45.00',
            baseQuantity: '1',
            baseLabel: 'kg',
          },
        ],
      },
    });

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Acém')).toBeInTheDocument();
    expect(screen.getByText('Pão de hambúrguer')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Só os mudados' });
    await user.click(toggle);

    expect(screen.getByText('Acém')).toBeInTheDocument();
    expect(screen.queryByText('Pão de hambúrguer')).toBeNull();
  });

  it('clique no nome abre o histórico com as linhas do fake', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    client.costs.historyRows = [
      {
        createdAt: '2026-11-05T15:30:00Z',
        userName: 'gerente',
        oldBasePrice: '35.00',
        newBasePrice: '39.90',
        baseQuantity: '1',
        baseLabel: 'kg',
        oldUnitCost: '35.0000',
        newUnitCost: '39.9000',
      },
    ];
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    const supplyNameButton = await screen.findByRole('button', {
      name: 'Acém',
    });
    await user.click(supplyNameButton);

    expect(
      await screen.findByRole('heading', { name: 'Histórico: Acém' }),
    ).toBeInTheDocument();
    expect(screen.getByText('gerente')).toBeInTheDocument();
  });

  it('valor inválido na célula exibe aria-invalid e não chama setBasePrice', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    const input = await screen.findByLabelText(/preço base do acém/i);
    await user.clear(input);
    vi.mocked(draft.setBasePrice).mockClear();
    await user.type(input, 'abc');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(draft.setBasePrice).not.toHaveBeenCalled();
  });

  it('exibe coluna Última nota com dados do last-prices', async () => {
    const client = new FakeApiClient();
    client.purchases.lastPrices = {
      1: {
        issuedAt: '2026-10-30T14:20:00.000Z',
        vendorName: 'Faroeste',
        paidPerUnit: '1.2719',
        diffPercent: '2.2',
        above: true,
      },
    };
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Última nota')).toBeInTheDocument();
    expect(
      await screen.findByText(/1,2719 · Faroeste · 30\/10/),
    ).toBeInTheDocument();
    expect(screen.getByText('+2,2%')).toHaveClass('tag-danger');
  });

  it('diálogo do insumo contém o histórico do preço base e as compras na nota', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    client.costs.historyRows = [
      {
        createdAt: '2026-11-01T10:00:00Z',
        userName: 'gerente',
        oldBasePrice: '38.00',
        newBasePrice: '39.90',
        baseQuantity: '1',
        baseLabel: 'kg',
        oldUnitCost: '38.0000',
        newUnitCost: '39.9000',
      },
    ];
    client.purchases.supplyPrices[1] = [
      {
        invoiceId: 101,
        issuedAt: '2026-10-30T14:20:00.000Z',
        vendorName: 'Faroeste',
        description: 'ACEM BOV KG',
        quantity: '5',
        unit: 'KG',
        unitPrice: '39.90',
        label: 'kg',
        baseQuantity: '1',
        paidPerUnit: '39.9000',
        basePerUnit: '38.0000',
        diffPercent: '5.0',
        above: true,
      },
    ];
    const draft = createMockDraft();

    render(
      <ApiContext.Provider value={client}>
        <SuppliesCostTab view={draft.sheet!} draft={draft} />
      </ApiContext.Provider>,
    );

    const supplyNameButton = await screen.findByRole('button', {
      name: 'Acém',
    });
    await user.click(supplyNameButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Histórico: Acém',
    });

    // Primeira parte: Preço base e custo
    expect(within(dialog).getByText('Preço base e custo')).toBeInTheDocument();
    expect(within(dialog).getByText('gerente')).toBeInTheDocument();

    // Segunda parte: Compras na nota
    expect(within(dialog).getByText('Compras na nota')).toBeInTheDocument();
    expect(within(dialog).getByText('ACEM BOV KG')).toBeInTheDocument();
    expect(within(dialog).getByText('Faroeste')).toBeInTheDocument();
  });
});
