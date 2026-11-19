import type { CSSProperties } from 'react';
import type { ProductCostView } from '../api/cost-types';
import { splitOf, type PriceSplit } from './price-split';

/** Por que a barra fica vazia; null = há barra. */
function emptyReasonOf(view: ProductCostView): string | null {
  if (view.salePrice === null) return 'sem preço no cardápio';
  if (!view.cmvComplete && Number(view.cmv) === 0)
    return 'sem custo: ponha o preço do insumo em Insumos';
  return null;
}

const width = (fraction: number): CSSProperties => ({
  width: `${Math.max(0, fraction) * 100}%`,
});

function BarSegments({ split, below }: { split: PriceSplit; below: boolean }) {
  return (
    <>
      <span className="price-bar-supplies" style={width(split.supplies)} />
      <span className="price-bar-fixed" style={width(split.fixed)} />
      <span
        className={below ? 'price-bar-profit is-below' : 'price-bar-profit'}
        style={width(split.profit)}
      />
      <span className="price-bar-loss" style={width(split.loss)} />
    </>
  );
}

/**
 * Para onde vai o preço de hoje do lanche: insumos (ocre), custo fixo (cinza) e lucro (verde, ou
 * vermelho abaixo da meta), com a marca de onde o lucro alcança a meta. Sem preço ou sem custo, a
 * barra fica vazia com o motivo.
 *
 * @example <PriceBar view={xBurguer} />
 */
export function PriceBar({ view }: { view: ProductCostView }) {
  const reason = emptyReasonOf(view);
  const split = reason === null ? splitOf(view) : null;
  if (split === null)
    return <span className="price-bar-empty">{reason ?? 'sem preço'}</span>;
  const mark = split.targetMark;
  return (
    <span className="price-bar" aria-hidden="true">
      <span className="price-bar-track">
        <BarSegments split={split} below={view.targetStatus === 'below'} />
      </span>
      {mark !== null && (
        <span className="price-bar-mark" style={{ left: `${mark * 100}%` }} />
      )}
    </span>
  );
}
