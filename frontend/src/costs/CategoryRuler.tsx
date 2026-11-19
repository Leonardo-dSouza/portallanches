import type { PricingCategory, ProductCostView } from '../api/cost-types';
import { formatMoney } from '../api/money';
import { formatPercentText, rulerOf } from './price-split';

const percent = (value: string) => `${formatPercentText(value)}%`;

function RulerBar({ fixed, profit }: { fixed: string; profit: string }) {
  const ruler = rulerOf(fixed, profit);
  const parts = [
    {
      className: 'is-supplies',
      text: `${formatMoney(ruler.supplies)} paga os insumos`,
      share: ruler.suppliesPercent,
    },
    {
      className: 'is-fixed',
      text: `${formatMoney(ruler.fixed)} vai para o custo fixo`,
      share: fixed,
    },
    {
      className: 'is-profit',
      text: `${formatMoney(ruler.profit)} é lucro`,
      share: profit,
    },
  ];
  return (
    <div className="ruler-bar">
      {parts.map((part) => (
        <div
          key={part.className}
          className={`ruler-part ${part.className}`}
          style={{ flexGrow: Number(part.share) }}
        >
          <span className="ruler-chip">{part.text}</span>
          <span className="ruler-share">{percent(part.share)} do preço</span>
        </div>
      ))}
    </div>
  );
}

/** "Vale para a categoria inteira. X Burguer tem meta própria de 10%, como na planilha." */
function OwnTargetsNote({ products }: { products: ProductCostView[] }) {
  const own = products.filter((p) => p.ownProfitTarget && p.profitTarget);
  const list = own.map(
    (p) => `${p.name} tem meta própria de ${percent(p.profitTarget!)}`,
  );
  return (
    <p className="hint">
      Vale para a categoria inteira.{list.length > 0 && ` ${list.join('; ')}.`}
    </p>
  );
}

function RulerRule({
  divisor,
  suppliesPercent,
}: {
  divisor: string;
  suppliesPercent: string;
}) {
  const divisorText = divisor.replace('.', ',');
  return (
    <aside className="ruler-rule">
      <h3>Preço sugerido</h3>
      <p className="ruler-formula">custo dos insumos ÷ {divisorText}</p>
      <p className="hint">
        {divisorText} são os {percent(suppliesPercent)} do preço que sobram para
        os insumos depois do custo fixo e do lucro. O resultado sobe para os
        próximos 10 centavos.
      </p>
      <a className="button button-secondary button-sm" href="/cadastros">
        Mudar os % em Cadastros
      </a>
    </aside>
  );
}

/**
 * Régua da categoria: de cada R$ 10 que se cobra, quanto paga os insumos, quanto vai para o custo
 * fixo e quanto é lucro, com a regra do preço sugerido ao lado. Sem os % do PV, só uma frase.
 *
 * @example <CategoryRuler category={tradicional} products={rows} />
 */
export function CategoryRuler({
  category,
  products,
}: {
  category: PricingCategory;
  products: ProductCostView[];
}) {
  const { fixedCostPercent: fixed, profitPercent: profit } = category;
  if (fixed === null || profit === null)
    return (
      <p className="card ruler-none">
        Sem meta de lucro nesta categoria: a barra mostra o custo e quanto sobra
        de cada venda (preço − custo).
      </p>
    );
  const ruler = rulerOf(fixed, profit);
  return (
    <section className="card ruler" aria-label={`Régua da ${category.name}`}>
      <div className="ruler-main">
        <h2>{category.name}: de cada R$ 10,00 que você cobra</h2>
        <RulerBar fixed={fixed} profit={profit} />
        <OwnTargetsNote products={products} />
      </div>
      <RulerRule
        divisor={ruler.divisor}
        suppliesPercent={ruler.suppliesPercent}
      />
    </section>
  );
}
