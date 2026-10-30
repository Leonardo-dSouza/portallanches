import { formatAmount } from '../api/money';
import type { TicketItem } from './ticket-items';

interface ItemRowsProps {
  item: TicketItem;
  /** Falso no consumo interno (2026-10-23): o nome ocupa a largura toda, sem valores. */
  prices: boolean;
}

/** O nome no papel e, no ALTERADO, a marca do que é novo. */
function ItemTitle({ item }: { item: TicketItem }) {
  return (
    <>
      {item.title}
      {item.newMark && <strong className="ticket-new"> {item.newMark}</strong>}
    </>
  );
}

/** Unitário e total nas duas colunas da direita; sem preços, nada (o texto ocupa as três). */
function PriceCells({
  unit,
  total,
  prices,
}: {
  unit: string;
  total: string;
  prices: boolean;
}) {
  if (!prices) return null;
  return (
    <>
      <td className="num">{formatAmount(unit)}</td>
      <td className="num">{formatAmount(total)}</td>
    </>
  );
}

/** Os adicionais ("+1 LC", unit., total), as retiradas e a observação, embaixo do nome. */
function ItemDetails({ item, prices }: ItemRowsProps) {
  return (
    <>
      {item.addons.map((addon) => (
        <tr key={addon.key} className="ticket-item-detail">
          <td colSpan={prices ? 1 : 3}>{addon.label}</td>
          <PriceCells
            unit={addon.unitPrice}
            total={addon.total}
            prices={prices}
          />
        </tr>
      ))}
      {item.removals.map((removal) => (
        <tr key={removal} className="ticket-item-detail">
          <td colSpan={3}>{removal}</td>
        </tr>
      ))}
      {item.note && (
        <tr className="ticket-item-detail ticket-item-note">
          <td colSpan={3}>{item.note}</td>
        </tr>
      )}
    </>
  );
}

/** Lanche: o nome com a largura toda e, por último, o lanche completo (unitário e total). */
function LancheRows({ item, prices }: ItemRowsProps) {
  return (
    <tbody>
      <tr className="ticket-item-title">
        <td colSpan={3}>
          <ItemTitle item={item} />
        </td>
      </tr>
      <ItemDetails item={item} prices={prices} />
      {prices && (
        <tr className="ticket-item-price">
          <td>{formatAmount(item.unitPrice)}</td>
          <td />
          <td className="num">{formatAmount(item.total)}</td>
        </tr>
      )}
    </tbody>
  );
}

/** O resto (açaí, bebida, combo): nome, unitário e total na mesma linha, como antes. */
function InlineRows({ item, prices }: ItemRowsProps) {
  return (
    <tbody>
      <tr className="ticket-item-title">
        <td colSpan={prices ? 1 : 3}>
          <ItemTitle item={item} />
        </td>
        <PriceCells unit={item.unitPrice} total={item.total} prices={prices} />
      </tr>
      <ItemDetails item={item} prices={prices} />
    </tbody>
  );
}

/**
 * Itens da comanda impressa (pedido do usuário, 2026-10-11), sem o cabeçalho das colunas: o
 * lanche em duas linhas, o resto numa só. Um `tbody` por item, para o respiro entre eles.
 *
 * @example <TicketItems items={receipt.items} prices />
 */
export function TicketItems({
  items,
  prices,
}: {
  items: TicketItem[];
  prices: boolean;
}) {
  return (
    <table className="ticket-items">
      {items.map((item) =>
        item.layout === 'lanche' ? (
          <LancheRows key={item.key} item={item} prices={prices} />
        ) : (
          <InlineRows key={item.key} item={item} prices={prices} />
        ),
      )}
    </table>
  );
}
