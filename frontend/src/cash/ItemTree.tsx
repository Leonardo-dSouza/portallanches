import { detailsOf, type ItemTreeRow } from './item-tree';

/**
 * Pedido em árvore (pedido do usuário, 2026-10-09): o item e, embaixo, "+ bacon" e a
 * observação. A quantidade aparece sempre, até no 1× (2026-10-10). O "| -" dos detalhes
 * vem do CSS (`.item-tree-details`).
 */
export function ItemTree({ rows }: { rows: ItemTreeRow[] }) {
  if (rows.length === 0) return <span>—</span>;
  return (
    <ul className="item-tree">
      {rows.map((row) => (
        <li key={row.key}>
          {`${row.quantity}× ${row.name}`}
          {row.artisanal && ' (art.)'}
          <ItemDetails details={detailsOf(row)} />
        </li>
      ))}
    </ul>
  );
}

/** Os adicionais e a observação embaixo do item. */
function ItemDetails({ details }: { details: string[] }) {
  if (details.length === 0) return null;
  return (
    <ul className="item-tree-details">
      {details.map((detail, index) => (
        <li key={index}>{detail}</li>
      ))}
    </ul>
  );
}
