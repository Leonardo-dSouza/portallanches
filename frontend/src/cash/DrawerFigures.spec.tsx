import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DrawerReport } from '../api/types';
import { DrawerFigures } from './DrawerFigures';

const BASE_DRAWER: DrawerReport = {
  openingCash: '30.00',
  cashTolerance: '2.00',
  countRequired: false,
  toCount: [],
  check: null,
};

describe('DrawerFigures', () => {
  it('mostra "Sem conferência" quando check é nulo e a noite está fechada', () => {
    render(<DrawerFigures drawer={BASE_DRAWER} status="CLOSED" />);
    expect(screen.getByText('Sem conferência')).toBeInTheDocument();
    expect(screen.getByText('Troco inicial')).toBeInTheDocument();
    expect(screen.getByText('R$ 30,00')).toBeInTheDocument();
  });

  it('mostra que a conferência aparece depois de fechar quando a noite está aberta', () => {
    render(
      <DrawerFigures
        drawer={{ ...BASE_DRAWER, openingCash: null }}
        status="OPEN"
      />,
    );
    expect(
      screen.getByText('A conferência aparece depois de fechar o dia.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it('renderiza as 4 formas de resultado, com destaque na sobra e na falta', () => {
    const drawerWithLines: DrawerReport = {
      ...BASE_DRAWER,
      check: {
        countedBy: 'Maria',
        countedAt: '2026-10-10T23:41:00Z',
        note: null,
        lines: [
          {
            paymentMethodId: 1,
            name: 'Dinheiro',
            expected: '50.00',
            counted: '50.00',
            difference: '0.00',
            verdict: 'MATCH',
          },
          {
            paymentMethodId: 2,
            name: 'Dinheiro Com Diferença',
            expected: '40.00',
            counted: '41.50',
            difference: '1.50',
            verdict: 'MATCH',
          },
          {
            paymentMethodId: 3,
            name: 'PIX',
            expected: '100.00',
            counted: '105.00',
            difference: '5.00',
            verdict: 'OVER',
          },
          {
            paymentMethodId: 4,
            name: 'Cartão Ton',
            expected: '60.00',
            counted: '55.00',
            difference: '-5.00',
            verdict: 'SHORT',
          },
        ],
      },
    };
    render(<DrawerFigures drawer={drawerWithLines} status="CLOSED" />);
    expect(screen.getByText('Bateu')).not.toHaveClass('drawer-off');
    expect(screen.getByText('Bateu (sobrou R$ 1,50)')).not.toHaveClass(
      'drawer-off',
    );
    expect(screen.getByText('Sobrou R$ 5,00')).toHaveClass('drawer-off');
    expect(screen.getByText('Faltou R$ 5,00')).toHaveClass('drawer-off');
  });

  it('exibe quem contou, o horário e a observação', () => {
    const drawerWithNote: DrawerReport = {
      ...BASE_DRAWER,
      check: {
        countedBy: 'João',
        countedAt: '2026-10-10T23:41:00Z',
        note: 'Tirei R$ 15 para o motoboy',
        lines: [],
      },
    };
    render(<DrawerFigures drawer={drawerWithNote} status="CLOSED" />);
    expect(screen.getByText('Contado por João às 20:41')).toBeInTheDocument();
    expect(screen.getByText('Tirei R$ 15 para o motoboy')).toBeInTheDocument();
  });

  it('renderiza o elemento action no fim do quadro quando passado', () => {
    render(
      <DrawerFigures
        drawer={BASE_DRAWER}
        status="CLOSED"
        action={<button type="button">Corrigir troco inicial</button>}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Corrigir troco inicial' }),
    ).toBeInTheDocument();
  });
});
