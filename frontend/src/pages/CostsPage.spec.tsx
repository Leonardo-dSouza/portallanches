import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CostsPage } from './CostsPage';

function renderPage(client: FakeApiClient) {
  return render(
    <ApiContext.Provider value={client}>
      <CostsPage />
    </ApiContext.Provider>,
  );
}

describe('CostsPage', () => {
  it('carrega o GET /costs e mostra o cabeçalho e a aba Insumos', async () => {
    const client = new FakeApiClient();
    renderPage(client);

    expect(
      screen.getByText(
        'As abas da planilha, dentro do sistema. Nada vale até você salvar.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Acém')).toBeInTheDocument();
    expect(screen.getByText('Hambúrguer artesanal carne')).toBeInTheDocument();
    expect(screen.getByText('Pão de hambúrguer')).toBeInTheDocument();
  });

  it('abre o diálogo de salvar a partir da DraftBar quando há mudanças', async () => {
    const client = new FakeApiClient();
    renderPage(client);

    expect(await screen.findByText('Acém')).toBeInTheDocument();

    // DraftBar não aparece sem mudanças
    expect(screen.queryByText(/alterações não salvas/)).toBeNull();
  });
});
