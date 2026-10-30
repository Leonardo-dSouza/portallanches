import { formatAmount } from '../api/money';
import { useTicketSettings } from '../print/ticket-settings';
import { nameWithMark, type ItemTreeRow } from './item-tree';

/** Linha do item e, embaixo, cada adicional com o preço dele, as retiradas e a observação. */
function ItemRows({ row, mark }: { row: ItemTreeRow; mark: string }) {
  return (
    <>
      <tr className="items-table-item">
        <td>{row.quantity}×</td>
        <td>{nameWithMark(row, mark)}</td>
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
      {row.removals.map((removal) => (
        <tr key={removal} className="items-table-detail items-table-note">
          <td />
          <td colSpan={3}>{removal}</td>
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
 * Itens do pedido em colunas (pedido do usuário, 2026-10-10): Qtd, Item, Unit. e Total, no
 * pop-up do pedido. A comanda impressa tem o desenho dela (`print/TicketItems`, 2026-10-11).
 *
 * @example <ItemsTable rows={treeOfOrderItems(order.items)} />
 */
export function ItemsTable({ rows }: { rows: ItemTreeRow[] }) {
  const { artisanalMark } = useTicketSettings();
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
          <ItemRows key={row.key} row={row} mark={artisanalMark} />
        ))}
      </tbody>
    </table>
  );
}
