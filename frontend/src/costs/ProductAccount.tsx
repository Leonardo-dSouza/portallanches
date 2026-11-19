import { useId, type ReactNode } from 'react';
import type {
  IfoodPricing,
  PricingCategory,
  ProductCostView,
} from '../api/cost-types';
import { formatMoney } from '../api/money';
import { quotientSentence, statusSentence } from './cost-text';
import { divisorOf, fixedCostAmount, formatPercentText } from './price-split';
import { TestPriceBox } from './TestPriceBox';
import type { CostDraft } from './use-cost-draft';

interface StepProps {
  title: string;
  value: string;
  children?: ReactNode;
}

/** Um passo numerado da conta: o que é, como se chega e o número. */
function AccountStep({ title, value, children }: StepProps) {
  return (
    <li className="account-step">
      <div>
        <strong>{title}</strong>
        {children}
      </div>
      <span className="account-value">{value}</span>
    </li>
  );
}

const percent = (value: string) => `${formatPercentText(value)}%`;

function PriceSteps({ view, fixed }: { view: ProductCostView; fixed: string }) {
  const target = view.profitTarget!;
  const divisor = divisorOf(fixed, target);
  const left = (Number(divisor) * 100).toFixed(2);
  return (
    <>
      <AccountStep title="Insumos somados" value={formatMoney(view.cmv)}>
        <p>A soma da receita do lanche.</p>
      </AccountStep>
      <AccountStep title="O que sobra para os insumos" value={percent(left)}>
        <p>{`100% − ${percent(fixed)} de custo fixo − ${percent(target)} de lucro`}</p>
      </AccountStep>
      <AccountStep
        title="Preço sugerido"
        value={view.pv ? formatMoney(view.pv) : '—'}
      >
        <p>{quotientSentence(view.cmv, divisor, view.pv ?? '0.00')}</p>
      </AccountStep>
    </>
  );
}

function MenuPriceStep({ view }: { view: ProductCostView }) {
  const fixedAmount = fixedCostAmount(view);
  if (view.salePrice === null || view.profit === null || fixedAmount === null)
    return (
      <AccountStep title="Com o preço do cardápio" value="—">
        <p>Sem preço no cardápio ainda: ponha em Cadastros.</p>
      </AccountStep>
    );
  const price = formatMoney(view.salePrice);
  return (
    <AccountStep
      title={`Com o preço do cardápio, ${price}`}
      value={formatMoney(view.profit)}
    >
      <p>{`${price} − ${formatMoney(fixedAmount)} de custo fixo − ${formatMoney(view.cmv)} de insumos`}</p>
      <p className={`account-status is-${view.targetStatus}`}>
        {statusSentence(view)}
      </p>
    </AccountStep>
  );
}

function IfoodStep({
  view,
  ifood,
}: {
  view: ProductCostView;
  ifood: IfoodPricing;
}) {
  return (
    <AccountStep
      title="No iFood"
      value={view.ifoodPv ? formatMoney(view.ifoodPv) : '—'}
    >
      <p>{`Já cobre a comissão de ${percent(ifood.commissionPercent)} e deixa ${percent(ifood.profitPercent)} de lucro.`}</p>
    </AccountStep>
  );
}

function OwnTargetBadge({
  view,
  category,
}: {
  view: ProductCostView;
  category: PricingCategory;
}) {
  if (!view.ownProfitTarget || !view.profitTarget || !category.profitPercent)
    return null;
  return (
    <span className="account-badge">
      {`meta própria: ${percent(view.profitTarget)} (a categoria usa ${percent(category.profitPercent)})`}
    </span>
  );
}

export interface ProductAccountProps {
  view: ProductCostView;
  category: PricingCategory;
  ifood: IfoodPricing;
  draft: Pick<CostDraft, 'simulateSalePrice'>;
}

/**
 * A conta do lanche, como na planilha, em passos: insumos, o que sobra para eles, o preço
 * sugerido, o lucro do preço de hoje contra a meta e o preço no iFood; embaixo, o teste de preço.
 *
 * @example <ProductAccount view={xBurguer} category={tradicional} ifood={snapshot.ifood} draft={draft} />
 */
export function ProductAccount({
  view,
  category,
  ifood,
  draft,
}: ProductAccountProps) {
  const titleId = useId();
  const fixed = category.fixedCostPercent;
  if (fixed === null || view.profitTarget === null) return null;
  return (
    <section className="account" aria-labelledby={titleId}>
      <header className="account-head">
        <h3 id={titleId}>A conta do {view.name}</h3>
        <OwnTargetBadge view={view} category={category} />
      </header>
      <ol className="account-steps">
        <PriceSteps view={view} fixed={fixed} />
        <MenuPriceStep view={view} />
        <IfoodStep view={view} ifood={ifood} />
      </ol>
      <TestPriceBox productId={view.id} draft={draft} />
    </section>
  );
}
