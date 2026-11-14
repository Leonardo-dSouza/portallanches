import { formatAmount } from '../api/money';
import { formatQuantity } from '../api/quantity';
import type { Supply } from '../api/types';
import {
  formatUnitCost,
  type BasePriceChoice,
} from '../costs/base-price-values';
import {
  BASE_DIFF_TEXT_CLASS,
  baseDiffTone,
  formatBaseDiff,
} from './invoice-format';
import { linkPreview } from './item-link-values';

interface LinkPreviewBoxProps {
  unitPrice: string;
  unit: string;
  supply: Supply;
  choice: BasePriceChoice;
}

/**
 * A conta antes de gravar (2026-11-14): "45,79 por CX ÷ 36 un = 1,2719 /un" e a base de hoje
 * com a diferença, para ver na hora se a embalagem escolhida faz sentido.
 *
 * @example <LinkPreviewBox unitPrice="45.79" unit="CX" supply={burger} choice={{ label: 'caixa', quantity: '36' }} />
 */
export function LinkPreviewBox({
  unitPrice,
  unit,
  supply,
  choice,
}: LinkPreviewBoxProps) {
  const preview = linkPreview(unitPrice, choice.quantity, supply.unitCost);
  if (!preview) return null;
  const count = supply.countUnit;
  return (
    <section className="link-preview" aria-label="Conta">
      <p>
        {`${formatAmount(unitPrice)} por ${unit} ÷ ${formatQuantity(choice.quantity)} ${count} = `}
        <strong>{formatUnitCost(preview.paidPerUnit, count)}</strong>
      </p>
      {preview.basePerUnit ? (
        <p>
          {`Base hoje: ${formatUnitCost(preview.basePerUnit, count)} `}
          <span className={BASE_DIFF_TEXT_CLASS[baseDiffTone(preview)]}>
            {formatBaseDiff(preview.diffPercent)}
          </span>
        </p>
      ) : (
        <p>
          Insumo sem preço base em Custos: este item fica sem alerta de preço.
        </p>
      )}
    </section>
  );
}
