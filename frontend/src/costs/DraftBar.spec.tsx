import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DraftBar } from './DraftBar';

describe('DraftBar', () => {
  it('some quando não há mudança', () => {
    const { container } = render(
      <DraftBar count={0} onDiscard={vi.fn()} onReview={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('mostra "Rascunho · 2 alterações não salvas"', () => {
    render(<DraftBar count={2} onDiscard={vi.fn()} onReview={vi.fn()} />);

    expect(
      screen.getByText('Rascunho · 2 alterações não salvas.'),
    ).toBeInTheDocument();
  });

  it('mostra "Rascunho · 1 alteração não salva." no singular', () => {
    render(<DraftBar count={1} onDiscard={vi.fn()} onReview={vi.fn()} />);

    expect(
      screen.getByText('Rascunho · 1 alteração não salva.'),
    ).toBeInTheDocument();
  });

  it('mostra resumo de fichas e lanches afetados', () => {
    render(
      <DraftBar
        count={1}
        recipeCount={1}
        productCount={11}
        onDiscard={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Muda 1 ficha de produção e o CMV de 11 lanches.', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('chama onDiscard e onReview nos cliques dos botões', async () => {
    const user = userEvent.setup();
    const discard = vi.fn();
    const review = vi.fn();

    render(<DraftBar count={2} onDiscard={discard} onReview={review} />);

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(discard).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: 'Ver impacto e salvar' }),
    );
    expect(review).toHaveBeenCalledTimes(1);
  });
});
