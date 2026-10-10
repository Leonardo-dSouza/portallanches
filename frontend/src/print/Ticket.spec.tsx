import { render, screen } from '@testing-library/react';
import { storedItem, storedLine } from '../test-support/order-menu';
import { orderFixture } from '../test-support/order-fixture';
import { additionReceipt, fullReceipt } from './receipt-model';
import { Ticket } from './Ticket';

const DAY = { paymentMethods: [], zones: [] };
const SALADA = storedItem(
  storedLine('X Salada', 'Tradicional', 2, '17.80'),
  [storedLine('Add bacon', 'Adicionais', 2, '6.00')],
  'sem tomate',
);

describe('Ticket', () => {
  it('a comanda: número, hora, tipo, nome, itens em colunas, total e pagamento', () => {
    render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({
            dayNumber: 12,
            items: [SALADA],
            amount: '47.60',
            paymentMethodId: null,
            customerName: 'Maria',
          }),
          DAY,
        )}
      />,
    );
    const ticket = screen.getByRole('article', { name: 'Comanda #12' });
    expect(ticket).toHaveTextContent('#12');
    expect(ticket).toHaveTextContent('20:41');
    expect(ticket).toHaveTextContent('Balcão');
    expect(ticket).toHaveTextContent('Maria');
    expect(screen.getByText('+ bacon')).toBeInTheDocument();
    expect(screen.getByText('sem tomate')).toBeInTheDocument();
    expect(screen.getByText('R$ 47,60')).toBeInTheDocument();
    expect(screen.getByText('ABERTO: paga no fim')).toBeInTheDocument();
  });

  it('a ADIÇÃO avisa no tipo e não tem total', () => {
    render(
      <Ticket
        receipt={additionReceipt(orderFixture({ dayNumber: 7 }), [SALADA])}
      />,
    );
    expect(screen.getByText('Balcão: ADIÇÃO')).toBeInTheDocument();
    expect(screen.queryAllByRole('term')).toEqual([]);
  });
});
