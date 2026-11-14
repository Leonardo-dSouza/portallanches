import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { CostHistoryRow, CostSupply } from '../api/cost-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CostHistoryDialog } from './CostHistoryDialog';

const MOCK_SUPPLY: CostSupply = {
  id: 1,
  name: 'Acém',
  sectionId: 1,
  countUnit: 'kg',
  unitCost: '45.0000',
  basePrice: '45.00',
  baseQuantity: '1',
  baseLabel: 'kg',
  packages: [{ name: 'kg', quantity: '1' }],
};

const SAMPLE_HISTORY: CostHistoryRow[] = [
  {
    createdAt: '2026-11-05T15:30:00Z',
    userName: 'admin',
    oldBasePrice: '39.90',
    newBasePrice: '45.00',
    baseQuantity: '1',
    baseLabel: 'kg',
    oldUnitCost: '39.9000',
    newUnitCost: '45.0000',
  },
];

describe('CostHistoryDialog', () => {
  it('mostra mensagem de vazio quando o insumo não possui histórico', async () => {
    const client = new FakeApiClient();
    client.costs.historyRows = [];
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={client}>
        <CostHistoryDialog supply={MOCK_SUPPLY} onClose={onClose} />
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByText('Sem mudanças registradas ainda.'),
    ).toBeInTheDocument();
  });

  it('renderiza as linhas do histórico com preço base e custo unitário', async () => {
    const client = new FakeApiClient();
    client.costs.historyRows = SAMPLE_HISTORY;
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={client}>
        <CostHistoryDialog supply={MOCK_SUPPLY} onClose={onClose} />
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 39,90 → R\$ 45,00/)).toBeInTheDocument();
    expect(screen.getByText(/39,9000 \/kg → 45,0000 \/kg/)).toBeInTheDocument();
  });

  it('exibe erro caso a requisição de histórico falhe', async () => {
    const client = new FakeApiClient();
    const failingCostApi = {
      sheet: vi.fn(),
      preview: vi.fn(),
      apply: vi.fn(),
      history: () => Promise.reject(new Error('Erro de conexão com o banco')),
    };
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={client}>
        <CostHistoryDialog
          supply={MOCK_SUPPLY}
          costApi={failingCostApi}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByText(/Erro de conexão com o banco/),
    ).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', async () => {
    const user = userEvent.setup();
    const client = new FakeApiClient();
    client.costs.historyRows = [];
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={client}>
        <CostHistoryDialog supply={MOCK_SUPPLY} onClose={onClose} />
      </ApiContext.Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Sem mudanças registradas ainda.'),
      ).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
