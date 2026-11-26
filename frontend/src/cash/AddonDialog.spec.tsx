import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ItemPreview } from './item-preview';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import type { RemovalChoice } from './removal-lookup';
import type { OrderItemsState } from './use-order-items';
import { AddonDialog } from './AddonDialog';

class FakeOrderItems implements OrderItemsState {
  lines: DraftLine[] = [];
  quantity = '1';
  text = '';
  preview: ItemPreview = { kind: 'idle' };
  problem: string | null = null;
  addonsChanged: { lineId: number; item: MenuItem; delta: number }[] = [];
  notesSet: { lineId: number; text: string }[] = [];
  removalsToggled: { lineId: number; choice: RemovalChoice }[] = [];
  choicesSet: { lineId: number; option: MenuItem }[] = [];

  setQuantity = () => {};
  startItem = () => {};
  setText = () => {};
  moveActive = () => {};
  enter = () => 'done' as const;
  pick = () => {};
  pickRemoval = () => {};
  adjustLast = () => {};
  changeQuantity = () => {};
  changeAddon = (lineId: number, item: MenuItem, delta: number) => {
    this.addonsChanged.push({ lineId, item, delta });
  };
  setNote = (lineId: number, text: string) => {
    this.notesSet.push({ lineId, text });
  };
  toggleRemoval = (lineId: number, choice: RemovalChoice) => {
    this.removalsToggled.push({ lineId, choice });
  };
  restoreLine = () => {};
  choose = () => false;
  chooseFor = (lineId: number, option: MenuItem) => {
    this.choicesSet.push({ lineId, option });
  };
  skipChoice = () => {};
  askPending = () => null;
  reset = () => {};
}

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 1,
    name: 'Item',
    menuNumber: null,
    categoryId: 1,
    categoryName: 'Geral',
    addonCategoryId: null,
    choiceCategoryId: null,
    sortOrder: 0,
    salePrice: '10.00',
    ifoodPrice: null,
    stockLeft: null,
    removables: [],
    bundleItems: [],
    ...overrides,
  };
}

const MORANGO = makeMenuItem({
  id: 101,
  name: 'Morango',
  categoryId: 3,
  categoryName: 'Adicionais',
  salePrice: '5.00',
});

const LEITE_CONDENSADO = makeMenuItem({
  id: 102,
  name: 'Leite Condensado',
  categoryId: 3,
  categoryName: 'Adicionais',
  salePrice: '3.50',
});

function makeLine(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    id: 1,
    productId: 10,
    name: 'Açaí 300ml Puro',
    menuNumber: null,
    categoryName: 'Açaí',
    unitPrice: '8.50',
    quantity: 1,
    note: '',
    choice: null,
    addons: [
      { productId: 101, name: 'Morango', unitPrice: '5.00', quantity: 1 },
      {
        productId: 102,
        name: 'Leite Condensado',
        unitPrice: '3.50',
        quantity: 2,
      },
    ],
    removals: [],
    ...overrides,
  };
}

describe('AddonDialog', () => {
  it('abre como janela com o nome da linha e o total com adicionais', () => {
    const line = makeLine();
    const items = new FakeOrderItems();
    items.lines = [line];
    render(
      <AddonDialog
        line={line}
        choices={[MORANGO, LEITE_CONDENSADO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Açaí 300ml Puro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 20,50')).toBeInTheDocument();
  });

  it('um clique na tecla soma 1', async () => {
    const line = makeLine();
    const items = new FakeOrderItems();
    items.lines = [line];
    render(
      <AddonDialog
        line={line}
        choices={[MORANGO, LEITE_CONDENSADO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mais Morango' }));
    expect(items.addonsChanged).toEqual([
      { lineId: line.id, item: MORANGO, delta: 1 },
    ]);
  });

  it('tecla escolhida mostra a quantidade e o menos', async () => {
    const line = makeLine();
    const items = new FakeOrderItems();
    items.lines = [line];
    render(
      <AddonDialog
        line={line}
        choices={[MORANGO, LEITE_CONDENSADO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('2×')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Menos Leite Condensado' }),
    );
    expect(items.addonsChanged).toEqual([
      { lineId: line.id, item: LEITE_CONDENSADO, delta: -1 },
    ]);
  });

  it('sem escolha de adicional não há botão Menos', () => {
    const emptyLine = makeLine({ addons: [] });
    const items = new FakeOrderItems();
    render(
      <AddonDialog
        line={emptyLine}
        choices={[MORANGO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={() => {}}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Menos Morango' }),
    ).not.toBeInTheDocument();
  });

  it('Pronto e Enter na observação gravam e devolvem o foco', async () => {
    const line = makeLine();
    const items = new FakeOrderItems();
    let closedWithFocus: boolean | null = null;
    const { unmount } = render(
      <AddonDialog
        line={line}
        choices={[MORANGO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={(returnFocus) => {
          closedWithFocus = returnFocus;
        }}
      />,
    );
    await userEvent.type(screen.getByLabelText('Observação'), 'pouca calda');
    await userEvent.click(screen.getByRole('button', { name: 'Pronto' }));
    expect(items.notesSet).toEqual([{ lineId: line.id, text: 'pouca calda' }]);
    expect(closedWithFocus).toBe(true);

    unmount();
    items.notesSet = [];
    closedWithFocus = null;
    render(
      <AddonDialog
        line={line}
        choices={[MORANGO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={(returnFocus) => {
          closedWithFocus = returnFocus;
        }}
      />,
    );
    await userEvent.type(
      screen.getByLabelText('Observação'),
      'pouca calda{Enter}',
    );
    expect(items.notesSet).toEqual([{ lineId: line.id, text: 'pouca calda' }]);
    expect(closedWithFocus).toBe(true);
  });

  it('Esc grava a observação e devolve o foco; clique fora grava sem devolver', async () => {
    const line = makeLine();
    const items = new FakeOrderItems();
    let closedWithFocus: boolean | null = null;
    const { unmount } = render(
      <AddonDialog
        line={line}
        choices={[MORANGO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={(returnFocus) => {
          closedWithFocus = returnFocus;
        }}
      />,
    );
    await userEvent.type(screen.getByLabelText('Observação'), 'pouca calda');
    fireEvent(
      screen.getByRole('dialog', { name: 'Açaí 300ml Puro' }),
      new Event('cancel'),
    );
    expect(items.notesSet).toEqual([{ lineId: line.id, text: 'pouca calda' }]);
    expect(closedWithFocus).toBe(true);

    unmount();
    items.notesSet = [];
    closedWithFocus = null;
    render(
      <AddonDialog
        line={line}
        choices={[MORANGO]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={(returnFocus) => {
          closedWithFocus = returnFocus;
        }}
      />,
    );
    await userEvent.type(screen.getByLabelText('Observação'), 'pouca calda');
    const dialog = screen.getByRole('dialog', { name: 'Açaí 300ml Puro' });
    fireEvent.click(dialog);
    expect(items.notesSet).toEqual([{ lineId: line.id, text: 'pouca calda' }]);
    expect(closedWithFocus).toBe(false);
  });

  it('sem adicionais mostra o aviso', () => {
    const line = makeLine({ addons: [] });
    const items = new FakeOrderItems();
    render(
      <AddonDialog
        line={line}
        choices={[]}
        removals={[]}
        choiceOptions={[]}
        items={items}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText('Este item não aceita adicionais.'),
    ).toBeInTheDocument();
  });
});
