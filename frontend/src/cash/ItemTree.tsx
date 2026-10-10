import type { ItemTreeRow } from './item-tree';

/**
 * Pedido em árvore (pedido do usuário, 2026-10-09): o item e, embaixo, "com bacon" e a
 * observação. O "| -" dos detalhes vem do CSS (`.item-tree-details`).
 */
export function ItemTree({ rows }: { rows: ItemTreeRow[] }) {
  if (rows.length === 0) return <span>—</span>;
  return (
    <ul className="item-tree">
      {rows.map((row) => (
        <li key={row.key}>
          {row.quantity > 1 && `${row.quantity}× `}
          {row.name}
          {row.artisanal && ' (art.)'}
          {row.details.length > 0 && (
            <ul className="item-tree-details">
              {row.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
