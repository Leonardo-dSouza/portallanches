import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSheetView } from '../api/cost-types';
import { ProductionTab } from './ProductionTab';

describe('ProductionTab', () => {
  const view: CostSheetView = {
    snapshot: {
      supplies: [
        {
          id: 1,
          name: 'Acém',
          countUnit: 'kg',
          sectionId: null,
          unitCost: '39.9000',
          basePrice: '39.90',
          baseQuantity: '1',
          baseLabel: 'kg',
          packages: [],
        },
        {
          id: 2,
          name: 'Hambúrguer artesanal carne',
          countUnit: 'un',
          sectionId: null,
          unitCost: '5.9900',
          basePrice: null,
          baseQuantity: null,
          baseLabel: null,
          packages: [],
        },
        {
          id: 3,
          name: 'Pão de hambúrguer',
          countUnit: 'un',
          sectionId: null,
          unitCost: '1.4000',
          basePrice: '1.40',
          baseQuantity: '1',
          baseLabel: 'un',
          packages: [],
        },
        {
          id: 4,
          name: 'Molho especial caseiro',
          countUnit: 'L',
          sectionId: null,
          unitCost: null,
          basePrice: null,
          baseQuantity: null,
          baseLabel: null,
          packages: [],
        },
      ],
      recipes: [
        {
          supplyId: 2,
          yieldQuantity: '10',
          items: [{ supplyId: 1, quantity: '1.5' }],
        },
      ],
      products: [],
      categories: [],
      ifood: { profitPercent: '22.00', commissionPercent: '12.00' },
      lastChangeSetId: 1,
    },
    products: [],
    incompleteSupplyIds: [],
  };

  const createMockDraft = () => ({
    sheet: view,
    changes: {
      basePrices: [],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    },
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
  });

  it('renderiza os cartões de fichas existentes e o rodapé explicativo', () => {
    const draft = createMockDraft();
    render(<ProductionTab view={view} draft={draft} />);

    expect(screen.getByText('Hambúrguer artesanal carne')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Produzir não baixa estoque: a ficha só calcula o custo.',
      ),
    ).toBeInTheDocument();
  });

  it('"Nova ficha" só oferece insumo sem ficha e que não é ingrediente', async () => {
    const user = userEvent.setup();
    const draft = createMockDraft();

    render(<ProductionTab view={view} draft={draft} />);

    const newBtn = screen.getByRole('button', { name: /nova ficha/i });
    await user.click(newBtn);

    // Diálogo aberto com opções elegíveis
    expect(screen.getByText('Nova ficha de produção')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    // Supply 2 já tem ficha -> não deve estar disponível
    // Supply 1 é ingrediente da ficha 2 -> não deve estar disponível
    // Supply 3 e 4 não têm ficha e não são ingredientes -> devem estar disponíveis
    const options = within(dialog).getAllByRole('button');
    const optionTexts = options.map((o) => o.textContent ?? '');

    expect(optionTexts.some((t) => t.includes('Hambúrguer artesanal'))).toBe(
      false,
    );
    expect(optionTexts.some((t) => t.includes('Acém'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Pão de hambúrguer'))).toBe(true);
    expect(optionTexts.some((t) => t.includes('Molho especial caseiro'))).toBe(
      true,
    );
  });

  it('cria cartão novo com rendimento 1 e entra no rascunho só ao ter ingrediente', async () => {
    const user = userEvent.setup();
    const draft = createMockDraft();

    render(<ProductionTab view={view} draft={draft} />);

    await user.click(screen.getByRole('button', { name: /nova ficha/i }));

    // Clica em "Molho especial caseiro"
    const option = screen.getByRole('button', {
      name: /Molho especial caseiro/i,
    });
    await user.click(option);

    // Agora o cartão aparece na tela
    const card = screen.getByRole('region', {
      name: 'Ficha de Molho especial caseiro',
    });
    expect(card).toBeInTheDocument();
    // draft.setRecipe ainda não foi chamado porque não tem ingredientes
    expect(draft.setRecipe).not.toHaveBeenCalled();

    // Adiciona um ingrediente
    const addIngredientBtn = within(card).getByRole('button', {
      name: /\+ Ingrediente/i,
    });
    await user.click(addIngredientBtn);

    const supplyChoice = within(card).getByRole('button', { name: /Acém/i });
    await user.click(supplyChoice);

    // Agora deve ter chamado draft.setRecipe
    expect(draft.setRecipe).toHaveBeenCalledWith({
      supplyId: 4,
      yieldQuantity: '1',
      items: [{ supplyId: 1, quantity: '1' }],
    });
  });
});
