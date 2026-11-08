import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DraftLine } from './order-lines';
import { ComandaBar } from './ComandaBar';

const line = (quantity = 1): DraftLine => ({
  id: 1,
  productId: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  unitPrice: '17.80',
  quantity,
  note: '',
  choice: null,
  addons: [],
  removals: [],
});

describe('ComandaBar', () => {
  it('não renderiza com 0 itens', () => {
    const { container } = render(
      <ComandaBar lines={[]} onOpenClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renderiza com 1 item', () => {
    const onOpenClose = vi.fn();
    render(<ComandaBar lines={[line(1)]} onOpenClose={onOpenClose} />);
    const button = screen.getByRole('button', {
      name: /Comanda: 1 item · R\$ 17,80\. Abrir fechamento\./,
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Comanda (1 item)')).toBeInTheDocument();
    expect(screen.getByText('· R$ 17,80')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onOpenClose).toHaveBeenCalledTimes(1);
  });
});
