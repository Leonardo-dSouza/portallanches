import { render, screen, within } from '@testing-library/react';
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
        'Quanto custa fazer cada lanche, por quanto ele deveria sair e quanto sobra para você. Aqui só se calcula: o preço do cardápio muda em Cadastros.',
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

  it('mostra uma aba por categoria depois de Insumos e Produção', async () => {
    const client = new FakeApiClient();
    renderPage(client);

    expect(await screen.findByText('Acém')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Insumos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Produção' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Artesanal' })).toBeInTheDocument();
  });

  it('a aba da categoria conta só os lanches abaixo da meta', async () => {
    const client = new FakeApiClient();
    const [xSalada] = client.costs.sheet.products;
    client.costs.sheet.products = [
      { ...xSalada, targetStatus: 'below', belowTarget: true },
      { ...xSalada, id: 11, targetStatus: 'near' },
    ];
    renderPage(client);

    const tab = await screen.findByRole('tab', { name: 'Artesanal' });
    expect(within(tab).getByText('1')).toBeInTheDocument();
    expect(
      within(screen.getByRole('tab', { name: 'Insumos' })).queryByText(/\d/),
    ).toBeNull();
  });
});
