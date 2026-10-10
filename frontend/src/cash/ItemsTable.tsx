import { formatAmount } from '../api/money';
import type { ItemTreeRow } from './item-tree';

/** Linha do item e, embaixo, cada adicional com o preço dele e a observação. */
function ItemRows({ row }: { row: ItemTreeRow }) {
  return (
    <>
      <tr className="items-table-item">
        <td>{row.quantity}×</td>
        <td>
          {row.name}
          {row.artisanal && ' (art.)'}
        </td>
        <td className="num">{formatAmount(row.unitPrice)}</td>
        <td className="num">{formatAmount(row.total)}</td>
      </tr>
      {row.addons.map((addon) => (
        <tr key={addon.key} className="items-table-detail">
          <td />
          <td>{addon.label}</td>
          <td className="num">{formatAmount(addon.unitPrice)}</td>
          <td className="num">{formatAmount(addon.total)}</td>
        </tr>
      ))}
      {row.note && (
        <tr className="items-table-detail items-table-note">
          <td />
          <td colSpan={3}>{row.note}</td>
        </tr>
      )}
    </>
  );
}

/**
 * Itens do pedido em colunas (pedido do usuário, 2026-10-10): Qtd, Item, Unit. e Total. Usado
 * no pop-up do pedido e, depois, na comanda impressa.
 *
 * @example <ItemsTable rows={treeOfOrderItems(order.items)} />
 */
export function ItemsTable({ rows }: { rows: ItemTreeRow[] }) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th>Qtd</th>
          <th>Item</th>
          <th className="num">Unit.</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ItemRows key={row.key} row={row} />
        ))}
      </tbody>
    </table>
  );
}
