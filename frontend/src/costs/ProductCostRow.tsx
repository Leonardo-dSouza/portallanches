import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { ProductCostView } from '../api/cost-types';
import { formatMoney } from '../api/money';
import { profitLine, suggestedPrice } from './cost-text';
import { formatPercentText } from './price-split';
import { PriceBar } from './PriceBar';

function NameCell({ view }: { view: ProductCostView }) {
  return (
    <span className="cost-row-name">
      <span>{view.name}</span>
      {view.ownProfitTarget && view.profitTarget && (
        <span className="cost-row-own">{`meta própria: ${formatPercentText(view.profitTarget)}%`}</span>
      )}
    </span>
  );
}

function CostCell({ view }: { view: ProductCostView }) {
  return (
    <span className="cost-row-cost num">
      <span>{formatMoney(view.cmv)}</span>
      {!view.cmvComplete && (
        <span className="tag tag-danger">custo incompleto</span>
      )}
    </span>
  );
}

function ProfitCell({ view, id }: { view: ProductCostView; id: string }) {
  const line = profitLine(view);
  const tone = view.targetStatus === 'below' ? 'is-below' : '';
  return (
    <span id={id} className={`cost-row-profit ${tone}`}>
      <strong>{view.profit === null ? '—' : formatMoney(view.profit)}</strong>
      {line && <span>{line}</span>}
    </span>
  );
}

function SuggestedCell({ view }: { view: ProductCostView }) {
  const suggested = suggestedPrice(view);
  if (suggested === null) return <span className="cost-row-suggested" />;
  if (suggested.same)
    return (
      <span className="cost-row-suggested is-same">
        <Check aria-hidden /> <span>igual ao cardápio</span>
      </span>
    );
  return (
    <span className="cost-row-suggested">
      <span>{suggested.price}</span>
      {suggested.diff && (
        <span className="cost-row-diff">{suggested.diff}</span>
      )}
    </span>
  );
}

export interface ProductCostRowProps {
  view: ProductCostView;
  open: boolean;
  /** Mudou no rascunho (receita): a linha fica marcada. */
  changed: boolean;
  detailId: string;
  onToggle(): void;
}

/**
 * Linha do lanche: nº, nome, custo, preço de hoje, para onde vai o preço, lucro e preço sugerido.
 * A linha inteira abre a conta.
 *
 * @example <ProductCostRow view={xBurguer} open={false} changed={false} detailId="d8" onToggle={toggle} />
 */
export function ProductCostRow({
  view,
  open,
  changed,
  detailId,
  onToggle,
}: ProductCostRowProps) {
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      className={`cost-row ${open ? 'is-open' : ''} ${changed ? 'is-changed' : ''}`}
      // O nome é só o lanche (senão o leitor lê a linha toda colada); o lucro vai na descrição.
      aria-label={view.name}
      aria-describedby={`${detailId}-profit`}
      aria-expanded={open}
      aria-controls={detailId}
      onClick={onToggle}
    >
      <span className="cost-row-number num">{view.menuNumber ?? ''}</span>
      <NameCell view={view} />
      <CostCell view={view} />
      <span className="cost-row-price num">
        {view.salePrice ? formatMoney(view.salePrice) : '—'}
      </span>
      <span className="cost-row-bar">
        <PriceBar view={view} />
      </span>
      <ProfitCell view={view} id={`${detailId}-profit`} />
      <SuggestedCell view={view} />
      <Chevron className="cost-row-chevron" aria-hidden />
    </button>
  );
}
