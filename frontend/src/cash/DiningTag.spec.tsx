import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiningTag } from './DiningTag';

describe('DiningTag', () => {
  it('não renderiza quando option é nulo', () => {
    const { container } = render(<DiningTag option={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza etiqueta COMER com data-dining="EAT_IN"', () => {
    render(<DiningTag option="EAT_IN" />);
    const tag = screen.getByText('COMER');
    expect(tag).toHaveClass('tag');
    expect(tag).toHaveAttribute('data-dining', 'EAT_IN');
  });

  it('renderiza etiqueta VIAGEM com data-dining="TAKEAWAY"', () => {
    render(<DiningTag option="TAKEAWAY" />);
    const tag = screen.getByText('VIAGEM');
    expect(tag).toHaveClass('tag');
    expect(tag).toHaveAttribute('data-dining', 'TAKEAWAY');
  });
});
