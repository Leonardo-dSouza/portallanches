import { formatMoney } from '../api/money';
import type { Product } from '../api/types';
import { describeCmvPercent } from './product-form-values';
import { CMV_TARGET_PERCENT, cmvLevel } from './product-menu';

// A régua vai de 0 a 60%: a meta (42%) fica a 70% da largura e o que passa de 60 enche.
const GAUGE_MAX_PERCENT = 60;

const widthOf = (percent: number): string =>
  `${(Math.min(percent, GAUGE_MAX_PERCENT) / GAUGE_MAX_PERCENT) * 100}%`;

/** CMV em reais, a régua contra a meta de 42% e a porcentagem; avisa CMV incompleto. */
export function CmvGauge({ product }: { product: Product }) {
  const level = cmvLevel(product.cmvPercent);
  const percent = Number(product.cmvPercent ?? 0);
  return (
    <div className="cmv-gauge" data-level={level}>
      <span className="cmv-value">
        {formatMoney(product.cmv)}
        {!product.cmvComplete && (
          <span
            className="cmv-incomplete"
            title="Algum insumo da composição está sem custo"
          >
            incompleto
          </span>
        )}
      </span>
      <span className="cmv-track" aria-hidden>
        <span className="cmv-fill" style={{ width: widthOf(percent) }} />
        <span
          className="cmv-target"
          style={{ left: widthOf(CMV_TARGET_PERCENT) }}
        />
      </span>
      <span className="cmv-percent">
        {describeCmvPercent(product.cmvPercent)}
      </span>
    </div>
  );
}
