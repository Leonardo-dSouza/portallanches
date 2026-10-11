import { render, screen, within } from '@testing-library/react';
import { storedItem, storedLine } from '../test-support/order-menu';
import { orderFixture } from '../test-support/order-fixture';
import { additionReceipt, fullReceipt } from './receipt-model';
import { DEFAULT_TICKET_SETTINGS } from './ticket-settings';
import { Ticket } from './Ticket';

const DAY = { paymentMethods: [], zones: [], ticket: DEFAULT_TICKET_SETTINGS };
const SALADA = storedItem(
  storedLine('X Salada', 'Tradicional', 2, '17.80', 9),
  [storedLine('Add bacon', 'Adicionais', 2, '6.00')],
  'sem tomate',
);

describe('Ticket', () => {
  it('a comanda: número, hora, tipo, nome, itens, total e pagamento', () => {
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
    expect(screen.getByText('+1 bacon')).toBeInTheDocument();
    expect(screen.getByText('sem tomate')).toBeInTheDocument();
    expect(screen.getByText('R$ 47,60')).toBeInTheDocument();
    expect(screen.getByText('ABERTO: paga no fim')).toBeInTheDocument();
  });

  it('lanche em duas linhas e o resto numa só, sem o cabeçalho das colunas', () => {
    const coca = storedItem(
      storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00'),
    );
    render(
      <Ticket
        receipt={fullReceipt(orderFixture({ items: [SALADA, coca] }), DAY)}
      />,
    );
    const rowTexts = screen.getAllByRole('row').map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );
    // X Salada 17,80 + bacon 6,00 = 23,80 por lanche; 2 lanches = 47,60.
    expect(rowTexts).toEqual([
      ['2 X Salada'],
      ['+1 bacon', '6,00', '6,00'],
      ['sem tomate'],
      ['23,80', '', '47,60'],
      ['1 Coca Cola 600ml', '7,00', '7,00'],
    ]);
    expect(screen.queryAllByRole('columnheader')).toEqual([]);
  });

  it('a ADIÇÃO avisa no tipo e não tem total', () => {
    render(
      <Ticket
        receipt={additionReceipt(
          orderFixture({ dayNumber: 7 }),
          [SALADA],
          DEFAULT_TICKET_SETTINGS,
        )}
      />,
    );
    expect(screen.getByText('Balcão: ADIÇÃO')).toBeInTheDocument();
    expect(screen.queryAllByRole('term')).toEqual([]);
  });
});
