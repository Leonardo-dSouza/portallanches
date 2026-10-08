import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { PercentChange } from '../api/analytics-types';
import { describeChange, type ChangeDirection } from './analytics-format';

const SPOKEN: Record<ChangeDirection, string> = {
  up: 'subiu',
  down: 'caiu',
  flat: 'igual,',
};

const ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

/**
 * Variação em relação ao período anterior: seta + número (a cor só reforça; subir é bom
 * para todos os números do visor).
 */
export function ChangeBadge({ change }: { change: PercentChange }) {
  const label = describeChange(change);
  if (!label)
    return (
      <span className="visor-change" data-direction="none">
        sem base de comparação
      </span>
    );
  const Icon = ICON[label.direction];
  return (
    <span
      className="visor-change"
      data-direction={label.direction}
      aria-label={`${SPOKEN[label.direction]} ${label.text}`}
    >
      <Icon aria-hidden />
      <span aria-hidden>{label.text}</span>
    </span>
  );
}
