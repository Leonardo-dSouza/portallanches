import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { LinkSupplyDialog, type LinkableItem } from './LinkSupplyDialog';

const SUPPLIES: Supply[] = [
  {
    id: 10,
    name: 'Hambúrguer 56g',
    countUnit: 'un',
    minStock: null,
    deductOnSale: true,
    dailyCount: false,
    sectionId: 1,
    active: true,
    packages: [{ name: 'caixa', quantity: '36' }],
    saleProduct: null,
    unitCost: '1.2444',
  },
  {
    id: 20,
    name: 'Queijo Prato',
    countUnit: 'kg',
    minStock: null,
    deductOnSale: true,
    dailyCount: false,
    sectionId: 1,
    active: true,
    packages: [{ name: 'peça', quantity: '3.5' }],
    saleProduct: null,
    unitCost: null,
  },
];

const BURGER_ITEM: LinkableItem = {
  code: 'HB-01',
  description: 'HAMBURGUER BOV 56G CX36',
  quantity: '2',
  unit: 'CX',
  unitPrice: '45.79',
};

const SAVED_LINK = {
  supplyId: 10,
  supplyName: 'Hambúrguer 56g',
  baseQuantity: '36',
  label: 'caixa',
  productName: null,
};

function renderDialog(item: LinkableItem = BURGER_ITEM) {
  const api = new FakeApiClient();
  // Compras é só do admin: o caixa nem recebe o preço base (unitCost).
  api.role = 'ADMIN';
  api.supplies = SUPPLIES;
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <ApiContext.Provider value={api}>
      <LinkSupplyDialog
        vendorId={1}
        item={item}
        onSaved={onSaved}
        onClose={onClose}
      />
    </ApiContext.Provider>,
  );
  return { api, onSaved, onClose };
}

const supplyList = () => screen.findByRole('group', { name: 'Insumo' });

describe('LinkSupplyDialog', () => {
  it('mostra o item com o que veio na nota', async () => {
    renderDialog();
    expect(
      await screen.findByText('HAMBURGUER BOV 56G CX36'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('cód. HB-01 · na nota: 2 CX × R$ 45,79'),
    ).toBeInTheDocument();
  });

  it('sugere o insumo pelo nome do item, no topo da lista, sem escolher sozinho', async () => {
    renderDialog();
    const radios = within(await supplyList()).getAllByRole('radio');
    expect(radios[0]).toHaveAccessibleName(/Hambúrguer 56g/);
    expect(radios[0]).not.toBeChecked();
    expect(
      within(radios[0].closest('label') as HTMLElement).getByText('sugerido'),
    ).toBeInTheDocument();
  });

  it('escolhe o insumo, vê a conta contra a base e grava pelo PUT /purchases/item-links', async () => {
    const user = userEvent.setup();
    const { api, onSaved, onClose } = renderDialog();
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    expect(screen.getByRole('radio', { name: 'caixa de 36 un' })).toBeChecked();
    const preview = screen.getByRole('region', { name: 'Conta' });
    expect(preview).toHaveTextContent('45,79 por CX ÷ 36 un = 1,2719 /un');
    expect(preview).toHaveTextContent('Base hoje: 1,2444 /un +2,2%');

    await user.click(screen.getByRole('button', { name: 'Gravar' }));

    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/purchases/item-links',
      body: {
        vendorId: 1,
        code: 'HB-01',
        supplyId: 10,
        baseQuantity: '36',
        label: 'caixa',
        productName: 'Hamburguer Bov 56g Cx36',
      },
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('trocar a embalagem refaz a conta', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    await user.click(screen.getByRole('radio', { name: 'unidade (un)' }));
    expect(screen.getByRole('region', { name: 'Conta' })).toHaveTextContent(
      '45,79 por CX ÷ 1 un = 45,7900 /un',
    );
  });

  it('insumo sem preço base avisa que fica sem alerta', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(
      await screen.findByRole('radio', { name: /Queijo Prato/ }),
    );
    expect(screen.getByRole('region', { name: 'Conta' })).toHaveTextContent(
      'Insumo sem preço base em Custos: este item fica sem alerta de preço.',
    );
  });

  it('a busca já vem com o foco', async () => {
    renderDialog();
    await supplyList();
    expect(
      screen.getByRole('searchbox', { name: 'Buscar insumo' }),
    ).toHaveFocus();
  });

  it('a busca filtra a lista sem acento', async () => {
    const user = userEvent.setup();
    renderDialog();
    const list = await supplyList();
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar insumo' }),
      'queijo',
    );
    expect(within(list).getAllByRole('radio')).toHaveLength(1);
    expect(within(list).getByRole('radio')).toHaveAccessibleName(
      /Queijo Prato/,
    );
  });

  it('ligação existente abre marcada e Desligar chama o DELETE', async () => {
    const user = userEvent.setup();
    const { api, onSaved, onClose } = renderDialog({
      ...BURGER_ITEM,
      link: SAVED_LINK,
    });
    expect(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: 'caixa de 36 un' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Desligar' }));

    expect(api.calls).toContainEqual({
      method: 'DELETE',
      path: '/purchases/item-links/1/HB-01',
      body: undefined,
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancelar fecha sem gravar', async () => {
    const user = userEvent.setup();
    const { api, onClose } = renderDialog();
    await supplyList();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('falha ao gravar mostra o motivo e deixa tentar de novo', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.supplies = SUPPLIES;
    api.purchases.linkSaveRefusal = 'Insumo 10 inativo';
    const onClose = vi.fn();
    render(
      <ApiContext.Provider value={api}>
        <LinkSupplyDialog
          vendorId={1}
          item={BURGER_ITEM}
          onSaved={vi.fn()}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Gravar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Insumo 10 inativo',
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Gravar' })).toBeEnabled();
  });

  it('o produto com a marca vem sugerido, dá para mudar e vai no PUT', async () => {
    const user = userEvent.setup();
    const { api } = renderDialog();
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    const product = screen.getByLabelText('Produto (com a marca)');
    expect(product).toHaveValue('Hamburguer Bov 56g Cx36');

    await user.clear(product);
    await user.type(product, 'Hambúrguer Seara 56g');
    await user.click(screen.getByRole('button', { name: 'Gravar' }));

    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({ productName: 'Hambúrguer Seara 56g' });
  });

  it('produto que o insumo já tem vem sugerido (junta os mercados)', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.supplies = SUPPLIES;
    api.purchases.links['2|SEARA-56'] = {
      supplyId: 10,
      supplyName: 'Hambúrguer 56g',
      baseQuantity: '36',
      label: 'caixa',
      productName: 'Hambúrguer Seara 56g',
    };
    render(
      <ApiContext.Provider value={api}>
        <LinkSupplyDialog
          vendorId={1}
          item={BURGER_ITEM}
          onSaved={vi.fn()}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    expect(
      await screen.findByDisplayValue('Hambúrguer Seara 56g'),
    ).toBeVisible();
  });

  it('sem o produto não grava e diz o que falta', async () => {
    const user = userEvent.setup();
    const { api } = renderDialog();
    await user.click(
      await screen.findByRole('radio', { name: /Hambúrguer 56g/ }),
    );
    await user.clear(screen.getByLabelText('Produto (com a marca)'));
    await user.click(screen.getByRole('button', { name: 'Gravar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Escreva o produto com a marca (ex.: Bacon Seara kg)',
    );
    expect(api.calls.some((c) => c.method === 'PUT')).toBe(false);
  });
});
