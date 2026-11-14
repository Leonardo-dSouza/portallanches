import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostDraft } from './use-cost-draft';
import { SaveCostsDialog } from './SaveCostsDialog';
import { createDefaultCostSheet } from '../test-support/fake-cost-routes';
import { createEmptyCostChanges } from './cost-draft';

function createMockDraft(overrides?: Partial<CostDraft>): CostDraft {
  const sheet = createDefaultCostSheet();
  return {
    sheet,
    changes: createEmptyCostChanges(),
    preview: {
      ...sheet,
      impact: {
        supplies: [
          {
            supplyId: 1,
            name: 'Acém',
            before: '39.9000',
            after: '45.0000',
          },
        ],
        products: [
          {
            before: {
              ...sheet.products[0],
              cmv: '12.93',
              cmvPercent: '38.3',
              pv: '30.80',
              belowTarget: false,
            },
            after: {
              ...sheet.products[0],
              cmv: '13.29',
              cmvPercent: '39.3',
              pv: '31.70',
              belowTarget: true,
            },
          },
          {
            before: {
              ...sheet.products[0],
              id: 11,
              name: 'X Egg',
              cmv: '14.00',
              cmvPercent: '40.0',
              pv: '32.00',
              belowTarget: true,
            },
            after: {
              ...sheet.products[0],
              id: 11,
              name: 'X Egg',
              cmv: '14.50',
              cmvPercent: '41.0',
              pv: '33.00',
              belowTarget: true,
            },
          },
        ],
        becameBelowTarget: 1,
      },
    },
    changeCount: 1,
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

describe('SaveCostsDialog', () => {
  it('mostra o insumo mudado com antes → depois', () => {
    const draft = createMockDraft();
    render(<SaveCostsDialog draft={draft} onClose={vi.fn()} />);

    expect(screen.getByText('Acém')).toBeInTheDocument();
    expect(screen.getByText('39,9000')).toBeInTheDocument();
    expect(screen.getByText('45,0000')).toBeInTheDocument();
    expect(screen.getByText('+12,8%')).toBeInTheDocument();
  });

  it('mostra a etiqueta só no lanche que passou a ficar abaixo da meta', () => {
    const draft = createMockDraft();
    render(<SaveCostsDialog draft={draft} onClose={vi.fn()} />);

    const badges = screen.getAllByText('lucro passa a < meta');
    expect(badges).toHaveLength(1);
    expect(screen.getByText('X Salada')).toBeInTheDocument();
    expect(screen.getByText('X Egg')).toBeInTheDocument();
  });

  it('o conflito mostra a mensagem e botão Recarregar', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const onClose = vi.fn();
    const draft = createMockDraft({ conflict: true, reload });

    render(<SaveCostsDialog draft={draft} onClose={onClose} />);

    expect(
      screen.getByText(
        'Os custos mudaram em outro aparelho. Recarregue para ver o que está valendo.',
      ),
    ).toBeInTheDocument();

    const reloadButton = screen.getByRole('button', { name: 'Recarregar' });
    await user.click(reloadButton);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('salva e fecha o diálogo', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const draft = createMockDraft({ save });

    render(<SaveCostsDialog draft={draft} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(save).toHaveBeenCalledTimes(1);
  });
});
