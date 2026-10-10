import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

class FakeCloseListener {
  closed = 0;
  onClose = () => {
    this.closed += 1;
  };
}

function renderDialog(listener = new FakeCloseListener()) {
  render(
    <Dialog title="Entrega para Ana" onClose={listener.onClose}>
      <p>conteúdo</p>
    </Dialog>,
  );
  return listener;
}

describe('Dialog', () => {
  it('abre como modal com o título como nome', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Entrega para Ana' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('o botão Fechar e o Esc (evento "cancel") fecham', async () => {
    const listener = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(listener.closed).toBe(2);
  });
});
