import { ArrowDown, ArrowUp, Equal } from 'lucide-react';
import type { PriceChange } from './price-change';

const ICONS = { up: ArrowUp, down: ArrowDown, same: Equal } as const;
const SPOKEN = { up: 'subiu', down: 'desceu', same: 'igual' } as const;

/**
 * Etiqueta da variação do preço: seta, porcentagem e o nome falado da direção (não só a cor).
 * Subir é ruim para quem compra (tom de perigo); descer, bom.
 */
export function PriceChangeTag({ change }: { change: PriceChange | null }) {
  if (!change) return <span className="price-change">—</span>;
  const Icon = ICONS[change.direction];
  return (
    <span className="price-change" data-direction={change.direction}>
      <Icon role="img" aria-label={SPOKEN[change.direction]} />
      {change.label}
    </span>
  );
}
