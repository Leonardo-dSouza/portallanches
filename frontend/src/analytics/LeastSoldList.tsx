import type { LancheSales } from '../api/analytics-types';
import { countLabel } from './analytics-format';

/** Lanches do cardápio que menos saíram, com a plaquinha do número (igual à do Cardápio). */
export function LeastSoldList({ lanches }: { lanches: LancheSales[] }) {
  if (lanches.length === 0)
    return <p className="analytics-empty">Nenhum lanche ativo no cardápio.</p>;
  return (
    <ul className="least-sold">
      {lanches.map((lanche) => (
        <li key={lanche.productId}>
          <span className="menu-number-chip">{lanche.menuNumber}</span>
          <span className="least-sold-name">
            {lanche.name}
            <small>{lanche.categoryName}</small>
          </span>
          <span className="least-sold-count" data-zero={lanche.quantity === 0}>
            {countLabel(lanche.quantity, 'vendido', 'vendidos')}
          </span>
        </li>
      ))}
    </ul>
  );
}
