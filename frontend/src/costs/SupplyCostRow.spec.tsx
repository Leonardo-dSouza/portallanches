import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSheetView, CostSupply } from '../api/cost-types';
import type { CostDraft } from './use-cost-draft';
import { createDefaultCostSheet } from '../test-support/fake-cost-routes';
import { SupplyCostRow } from './SupplyCostRow';
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

function renderRow(supply: CostSupply, view: CostSheetView) {
  const draft = createMockDraft();
  render(
    <table>
      <tbody>
        <SupplyCostRow
          supply={supply}
          view={view}
          draft={draft}
          localValue={undefined}
          error={undefined}
          selectedChoice={undefined}
          onSelectSupply={vi.fn()}
          onPriceChange={vi.fn()}
          onPackageChange={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

describe('SupplyCostRow', () => {
  it('insumo sem custo mostra "sem custo", mesmo estando na lista de incompletos da API', () => {
    const sheet = createDefaultCostSheet();
    const supply = { ...sheet.snapshot.supplies[0], unitCost: null };
    renderRow(supply, { ...sheet, incompleteSupplyIds: [supply.id] });

    expect(screen.getByText('sem custo')).toBeInTheDocument();
    expect(screen.queryByText('incompleto')).not.toBeInTheDocument();
  });

  it('produzido com ficha incompleta mostra o custo parcial e a etiqueta "incompleto"', () => {
    const sheet = createDefaultCostSheet();
    const supply = {
      ...sheet.snapshot.supplies[0],
      unitCost: '5.9114',
      countUnit: 'un',
    };
    renderRow(supply, { ...sheet, incompleteSupplyIds: [supply.id] });

    expect(screen.getByText(/5,9114/)).toBeInTheDocument();
    expect(screen.getByText('incompleto')).toBeInTheDocument();
  });

  it('renderiza insumo de compra com campo de preço base e select de embalagem', async () => {
    const draft = createMockDraft();
    const supply = draft.sheet!.snapshot.supplies[0];
    const onSelectSupply = vi.fn();
    const onPriceChange = vi.fn();
    const onPackageChange = vi.fn();

    render(
      <table>
        <tbody>
          <SupplyCostRow
            supply={supply}
            view={draft.sheet!}
            draft={draft}
            localValue={undefined}
            error={undefined}
            selectedChoice={undefined}
            onSelectSupply={onSelectSupply}
            onPriceChange={onPriceChange}
            onPackageChange={onPackageChange}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Acém')).toBeInTheDocument();
    expect(screen.getByLabelText(/preço base do acém/i)).toBeInTheDocument();
  });

  it('chama onSelectSupply ao clicar no nome do insumo', async () => {
    const user = userEvent.setup();
    const draft = createMockDraft();
    const supply = draft.sheet!.snapshot.supplies[0];
    const onSelectSupply = vi.fn();

    render(
      <table>
        <tbody>
          <SupplyCostRow
            supply={supply}
            view={draft.sheet!}
            draft={draft}
            localValue={undefined}
            error={undefined}
            selectedChoice={undefined}
            onSelectSupply={onSelectSupply}
            onPriceChange={vi.fn()}
            onPackageChange={vi.fn()}
          />
        </tbody>
      </table>,
    );

    await user.click(screen.getByRole('button', { name: 'Acém' }));
    expect(onSelectSupply).toHaveBeenCalledWith(supply);
  });
});
