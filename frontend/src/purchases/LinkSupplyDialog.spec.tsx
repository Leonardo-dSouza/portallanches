import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { LinkSupplyDialog } from './LinkSupplyDialog';

const SUPPLIES: Supply[] = [
  {
    id: 10,
    name: 'Hambúrguer artesanal',
    countUnit: 'un',
    minStock: null,
    deductOnSale: true,
    dailyCount: false,
    sectionId: 1,
    active: true,
    packages: [{ name: 'caixa', quantity: '36' }],
    saleProduct: null,
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
  },
];

function setupApi(supplies = SUPPLIES) {
  const api = new FakeApiClient();
  api.supplies = supplies;
  return api;
}

describe('LinkSupplyDialog', () => {
  it('escolhe o insumo, a embalagem e salva pelo PUT /purchases/item-links', async () => {
    const user = userEvent.setup();
    const api = setupApi();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <LinkSupplyDialog
          vendorId={1}
          item={{ code: 'HB-01', description: 'HAMBURGUER 56G' }}
          onSaved={onSaved}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByText('HAMBURGUER 56G (cód. HB-01)'),
    ).toBeInTheDocument();

    // Seleciona o insumo
    const supplySelect = screen.getByRole('combobox', { name: 'Insumo' });
    await user.selectOptions(supplySelect, '10');

    // Seleciona a embalagem (caixa de 36)
    const packageSelect = screen.getByRole('combobox', { name: 'Embalagem' });
    await user.selectOptions(packageSelect, 'caixa');

    // Grava
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
      },
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('ligação existente abre preenchida e tem botão Desligar que chama DELETE', async () => {
    const user = userEvent.setup();
    const api = setupApi();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <LinkSupplyDialog
          vendorId={1}
          item={{
            code: 'HB-01',
            description: 'HAMBURGUER 56G',
            link: {
              supplyId: 10,
              supplyName: 'Hambúrguer artesanal',
              baseQuantity: '36',
              label: 'caixa',
            },
          }}
          onSaved={onSaved}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );

    expect(await screen.findByRole('combobox', { name: 'Insumo' })).toHaveValue(
      '10',
    );
    expect(screen.getByRole('combobox', { name: 'Embalagem' })).toHaveValue(
      'caixa',
    );

    const unlinkButton = screen.getByRole('button', { name: 'Desligar' });
    await user.click(unlinkButton);

    expect(api.calls).toContainEqual({
      method: 'DELETE',
      path: '/purchases/item-links/1/HB-01',
      body: undefined,
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('filtra os insumos pelo campo de busca', async () => {
    const user = userEvent.setup();
    const api = setupApi();
    render(
      <ApiContext.Provider value={api}>
        <LinkSupplyDialog
          vendorId={1}
          item={{ code: 'HB-01', description: 'HAMBURGUER 56G' }}
          onSaved={vi.fn()}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    await screen.findByRole('combobox', { name: 'Insumo' });
    const search = screen.getByRole('searchbox', { name: 'Buscar insumo' });
    await user.type(search, 'Queijo');

    const supplySelect = screen.getByRole('combobox', { name: 'Insumo' });
    expect(supplySelect).toHaveTextContent('Queijo Prato');
    expect(supplySelect).not.toHaveTextContent('Hambúrguer artesanal');
  });
});
