import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { ItemPreview } from './item-preview';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import type { OrderItemsState } from './use-order-items';
import type { AddonPanelState } from './use-addon-panel';
import { OrderLines } from './OrderLines';

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

const ACAI = makeMenuItem({
  id: 10,
  name: 'Açaí 300ml',
  categoryName: 'Açaí',
  salePrice: '8.50',
  addonCategoryId: 3,
});

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

const MENU: MenuItem[] = [ACAI, MORANGO, LEITE_CONDENSADO];

function OrderLinesHarness({
  initialLines,
  menu = MENU,
}: {
  initialLines: DraftLine[];
  menu?: MenuItem[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [panelLineId, setPanelLineId] = useState<number | null>(null);

  const items: OrderItemsState = {
    lines,
    quantity: '1',
    text: '',
    preview: { kind: 'idle' } as ItemPreview,
    problem: null,
    setQuantity: () => {},
    startItem: () => {},
    setText: () => {},
    moveActive: () => {},
    enter: () => 'done' as const,
    pick: () => {},
    pickRemoval: () => {},
    adjustLast: () => {},
    changeQuantity: (lineId, delta) => {
      setLines((prev) =>
        prev
          .map((l) =>
            l.id === lineId ? { ...l, quantity: l.quantity + delta } : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    changeAddon: (lineId, item, delta) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== lineId) return l;
          const existing = l.addons.find((a) => a.productId === item.id);
          const quantity = (existing?.quantity ?? 0) + delta;
          const addons =
            quantity > 0
              ? existing
                ? l.addons.map((a) =>
                    a.productId === item.id ? { ...a, quantity } : a,
                  )
                : [
                    ...l.addons,
                    {
                      productId: item.id,
                      name: item.name,
                      unitPrice: item.salePrice,
                      quantity,
                    },
                  ]
              : l.addons.filter((a) => a.productId !== item.id);
          return { ...l, addons };
        }),
      );
    },
    setNote: (lineId, note) => {
      setLines((prev) =>
        prev.map((l) => (l.id === lineId ? { ...l, note } : l)),
      );
    },
    toggleRemoval: () => {},
    restoreLine: () => {},
    choose: () => false,
    chooseFor: (lineId, option) => {
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? {
                ...l,
                choice: {
                  productId: option.id,
                  name: option.name,
                  unitPrice: option.salePrice,
                },
              }
            : l,
        ),
      );
    },
    skipChoice: () => {},
    askPending: () => null,
    reset: () => {},
  };

  const panel: AddonPanelState = {
    lineId: panelLineId,
    open: setPanelLineId,
    openLast: (ls) => setPanelLineId(ls.at(-1)?.id ?? null),
    close: () => setPanelLineId(null),
  };

  return <OrderLines items={items} menu={menu} panel={panel} saved={[]} />;
}

describe('OrderLines', () => {
  it('a linha tem o botão com rótulo, contagem 3 e ao clicar abre o diálogo sem painel embutido', async () => {
    const line: DraftLine = {
      id: 1,
      productId: 10,
      name: 'Açaí 300ml Puro',
      categoryName: 'Açaí',
      menuNumber: null,
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
    };

    render(<OrderLinesHarness initialLines={[line]} />);

    const button = screen.getByRole('button', {
      name: 'Adicionais, retiradas e observação de Açaí 300ml Puro',
    });
    expect(within(button).getByText('Adicionais')).toBeInTheDocument();
    expect(within(button).getByText('3')).toBeInTheDocument();

    expect(document.querySelector('.order-line-panel')).toBeNull();

    await userEvent.click(button);
    expect(
      screen.getByRole('dialog', { name: 'Açaí 300ml Puro' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.order-line-panel')).toBeNull();
  });

  it('com duas linhas do mesmo açaí, abrir a 2ª e somar Morango mexe só na 2ª', async () => {
    const line1: DraftLine = {
      id: 1,
      productId: 10,
      name: 'Açaí 300ml',
      categoryName: 'Açaí',
      menuNumber: null,
      unitPrice: '8.50',
      quantity: 1,
      note: '',
      choice: null,
      addons: [],
      removals: [],
    };
    const line2: DraftLine = {
      id: 2,
      productId: 10,
      name: 'Açaí 300ml',
      categoryName: 'Açaí',
      menuNumber: null,
      unitPrice: '8.50',
      quantity: 1,
      note: '',
      choice: null,
      addons: [],
      removals: [],
    };

    render(<OrderLinesHarness initialLines={[line1, line2]} />);

    const button2 = screen.getByRole('button', {
      name: 'Adicionais, retiradas e observação de Açaí 300ml (linha 2)',
    });
    await userEvent.click(button2);

    const dialog = screen.getByRole('dialog', {
      name: 'Açaí 300ml (linha 2)',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Mais Morango' }),
    );

    // Fechar para inspecionar as linhas
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Pronto' }),
    );

    const button1After = screen.getByRole('button', {
      name: 'Adicionais, retiradas e observação de Açaí 300ml (linha 1)',
    });
    const button2After = screen.getByRole('button', {
      name: 'Adicionais, retiradas e observação de Açaí 300ml (linha 2)',
    });

    expect(within(button1After).queryByText('1')).toBeNull();
    expect(within(button2After).getByText('1')).toBeInTheDocument();
  });
});
