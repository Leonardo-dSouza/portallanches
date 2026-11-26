import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useAddonPanel } from './use-addon-panel';

/**
 * Imita a janela modal (2026-11-25): enquanto o painel está aberto, o resto da tela fica inerte.
 * O jsdom não tem `inert`; aqui o Qtd fica desabilitado, que também recusa o foco.
 */
function ModalPanelProbe() {
  const quantityRef = useRef<HTMLInputElement>(null);
  const panel = useAddonPanel(quantityRef);
  const open = panel.lineId !== null;
  return (
    <>
      <input aria-label="Qtd" ref={quantityRef} disabled={open} />
      <button type="button" onClick={() => panel.open(1)}>
        Abrir
      </button>
      {open && (
        <>
          <button type="button" onClick={() => panel.close(true)}>
            Pronto
          </button>
          <button type="button" onClick={() => panel.close(false)}>
            Fora
          </button>
        </>
      )}
    </>
  );
}

describe('useAddonPanel', () => {
  it('Pronto devolve o foco ao Qtd depois que a janela sai da tela', async () => {
    const user = userEvent.setup();
    render(<ModalPanelProbe />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Pronto' }));
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
  });

  it('clique fora fecha sem devolver o foco', async () => {
    const user = userEvent.setup();
    render(<ModalPanelProbe />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.getByLabelText('Qtd')).not.toHaveFocus();
  });
});
