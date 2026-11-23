import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IfoodReportFigures } from './IfoodReportFigures';

describe('IfoodReportFigures (2026-11-23)', () => {
  it('admin vê bruto, comissão e líquido', () => {
    render(
      <IfoodReportFigures
        ifood={{ count: 2, gross: '74.70', commission: '20.79', net: '53.91' }}
      />,
    );
    expect(screen.getByText('Bruto (2 pedidos)')).toBeInTheDocument();
    expect(screen.getByText('Comissão estimada')).toBeInTheDocument();
    expect(screen.getByText('Líquido estimado')).toBeInTheDocument();
  });

  it('caixa vê só quantos pedidos', () => {
    render(<IfoodReportFigures ifood={{ count: 1 }} />);
    expect(screen.getByText('Pedidos do iFood')).toBeInTheDocument();
    expect(screen.queryByText('Comissão estimada')).not.toBeInTheDocument();
  });

  it('sem pedido do iFood, o quadro some', () => {
    const { container } = render(<IfoodReportFigures ifood={{ count: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
