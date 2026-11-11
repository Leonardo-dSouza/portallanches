import { render, screen, within } from '@testing-library/react';
import { storedItem, storedLine } from '../test-support/order-menu';
import { orderFixture } from '../test-support/order-fixture';
import {
  addedReceipt,
  changedReceipt,
  fullReceipt,
  staffConsumptionReceipt,
} from './receipt-model';
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
    expect(screen.getByText('A PAGAR: paga no fim')).toBeInTheDocument();
  });

  it('a retirada sai embaixo do lanche, depois do adicional e antes da observação', () => {
    const noEgg = {
      ...SALADA,
      removals: [{ supplyId: 3, supplyName: 'Ovo' }],
    };
    render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({ dayNumber: 13, items: [noEgg] }),
          DAY,
        )}
      />,
    );
    const lines = screen
      .getAllByRole('row')
      .map((row) => row.textContent ?? '');
    const removal = lines.indexOf('s/ Ovo');
    expect(lines[removal - 1]).toContain('+1 bacon');
    expect(lines[removal + 1]).toBe('sem tomate');
  });

  it('lanche em duas linhas e o resto numa só, sem o cabeçalho das colunas', () => {
    const coca = {
      ...storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00')),
      productId: 60,
    };
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

  it('o nome do lanche sai em negrito; bebida e açaí não (2026-11-10, a térmica falhava no lanche)', () => {
    const coca = storedItem(
      storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00'),
    );
    render(
      <Ticket
        receipt={fullReceipt(orderFixture({ items: [SALADA, coca] }), DAY)}
      />,
    );
    const [lanche, bebida] = screen.getAllByRole('rowgroup');
    expect(lanche).toHaveClass('ticket-lanche');
    expect(bebida).not.toHaveClass('ticket-lanche');
  });

  it('o ALTERADO avisa no topo, marca o novo e lista o que saiu (2026-10-15)', () => {
    const coca = storedItem(
      storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00'),
    );
    render(
      <Ticket
        receipt={changedReceipt(
          orderFixture({ dayNumber: 7, items: [coca] }),
          [SALADA],
          DAY,
        )}
      />,
    );
    expect(screen.getByText('PEDIDO ALTERADO')).toBeInTheDocument();
    expect(screen.getByText('NOVO')).toBeInTheDocument();
    expect(screen.getByText(/^SAIU: 2 X Salada/)).toBeInTheDocument();
    expect(screen.getAllByRole('term').length).toBeGreaterThan(0);
  });

  it('consumo interno: a faixa CONSUMO INTERNO, para quem e os itens sem nenhum preço', () => {
    const receipt = staffConsumptionReceipt(
      {
        id: 40,
        closingId: 10,
        createdById: 2,
        createdAt: '2026-09-22T23:30:00.000Z',
        consumerName: 'Bianca',
        items: [SALADA],
        cmvTotal: '7.00',
        missingCostCount: 0,
      },
      DEFAULT_TICKET_SETTINGS,
    );
    render(<Ticket receipt={receipt} />);
    const ticket = screen.getByRole('article', {
      name: 'Comanda do consumo de Bianca',
    });
    expect(ticket).toHaveTextContent('CONSUMO INTERNO');
    expect(ticket).toHaveTextContent('Bianca');
    expect(within(ticket).getByText('+1 bacon')).toBeInTheDocument();
    expect(within(ticket).getByText('sem tomate')).toBeInTheDocument();
    expect(ticket).not.toHaveTextContent(/\d,\d\d/);
    expect(ticket).not.toHaveTextContent('COMER');
    expect(ticket).not.toHaveTextContent('VIAGEM');
  });

  it('COMER/VIAGEM vem depois dos itens e logo antes do total, fora do cabeçalho (2026-11-10)', () => {
    render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({
            dayNumber: 4,
            type: 'COUNTER',
            diningOption: 'EAT_IN',
            items: [SALADA],
            amount: '47.60',
          }),
          DAY,
        )}
      />,
    );
    const dining = screen.getByText('COMER');
    const total = screen.getByText('Total');
    const firstItem = screen.getByText(/X Salada/);
    expect(dining.closest('.ticket-head')).toBeNull();
    expect(firstItem.compareDocumentPosition(dining)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(dining.compareDocumentPosition(total)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('na ADIÇÃO também: depois dos itens novos e antes do total', () => {
    const after = orderFixture({
      type: 'COUNTER',
      diningOption: 'TAKEAWAY',
      items: [
        SALADA,
        storedItem(storedLine('Coca Cola 2l', 'Bebidas', 1, '15.00')),
      ],
    });
    render(<Ticket receipt={addedReceipt(after, [SALADA], DAY)} />);
    const dining = screen.getByText('VIAGEM');
    expect(
      screen.getByText(/Coca Cola 2l/).compareDocumentPosition(dining),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(dining.compareDocumentPosition(screen.getByText('Total'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('no balcão destaca COMER ou VIAGEM; entrega não mostra', () => {
    const { unmount } = render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({
            dayNumber: 1,
            type: 'COUNTER',
            diningOption: 'EAT_IN',
          }),
          DAY,
        )}
      />,
    );
    expect(screen.getByText('COMER')).toHaveClass('ticket-dining');
    unmount();

    const { unmount: unmount2 } = render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({
            dayNumber: 2,
            type: 'COUNTER',
            diningOption: 'TAKEAWAY',
          }),
          DAY,
        )}
      />,
    );
    expect(screen.getByText('VIAGEM')).toHaveClass('ticket-dining');
    unmount2();

    render(
      <Ticket
        receipt={fullReceipt(
          orderFixture({
            dayNumber: 3,
            type: 'DELIVERY',
            customerId: 5,
          }),
          DAY,
        )}
      />,
    );
    expect(screen.queryByText('COMER')).not.toBeInTheDocument();
    expect(screen.queryByText('VIAGEM')).not.toBeInTheDocument();
  });

  it('a ADIÇÃO mostra a faixa no topo, só os itens novos e o total novo do pedido (2026-11-08)', () => {
    const coca = storedItem(
      storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00'),
    );
    render(
      <Ticket
        receipt={addedReceipt(
          orderFixture({
            dayNumber: 7,
            amount: '24.80',
            items: [SALADA, coca],
          }),
          [SALADA],
          DAY,
        )}
      />,
    );
    expect(screen.getByText('ADIÇÃO')).toBeInTheDocument();
    expect(screen.getByText('1 Coca Cola 600ml')).toBeInTheDocument();
    expect(screen.queryByText(/X Salada/)).toBeNull();
    expect(screen.queryByText(/SAIU/)).toBeNull();
    expect(screen.getByText('R$ 24,80')).toBeInTheDocument();
  });
});
