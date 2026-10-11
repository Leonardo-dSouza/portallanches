import { formatAmount } from '../api/money';
import type { TicketItem } from './ticket-items';

/** Os adicionais ("+1 LC", unit., total) e a observação, embaixo do nome. */
function ItemDetails({ item }: { item: TicketItem }) {
  return (
    <>
      {item.addons.map((addon) => (
        <tr key={addon.key} className="ticket-item-detail">
          <td>{addon.label}</td>
          <td className="num">{formatAmount(addon.unitPrice)}</td>
          <td className="num">{formatAmount(addon.total)}</td>
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
function LancheRows({ item }: { item: TicketItem }) {
  return (
    <tbody>
      <tr className="ticket-item-title">
        <td colSpan={3}>{item.title}</td>
      </tr>
      <ItemDetails item={item} />
      <tr className="ticket-item-price">
        <td>{formatAmount(item.unitPrice)}</td>
        <td />
        <td className="num">{formatAmount(item.total)}</td>
      </tr>
    </tbody>
  );
}

/** O resto (açaí, bebida, combo): nome, unitário e total na mesma linha, como antes. */
function InlineRows({ item }: { item: TicketItem }) {
  return (
    <tbody>
      <tr className="ticket-item-title">
        <td>{item.title}</td>
        <td className="num">{formatAmount(item.unitPrice)}</td>
        <td className="num">{formatAmount(item.total)}</td>
      </tr>
      <ItemDetails item={item} />
    </tbody>
  );
}

/**
 * Itens da comanda impressa (pedido do usuário, 2026-10-11), sem o cabeçalho das colunas: o
 * lanche em duas linhas, o resto numa só. Um `tbody` por item, para o respiro entre eles.
 *
 * @example <TicketItems items={receipt.items} />
 */
export function TicketItems({ items }: { items: TicketItem[] }) {
  return (
    <table className="ticket-items">
      {items.map((item) =>
        item.layout === 'lanche' ? (
          <LancheRows key={item.key} item={item} />
        ) : (
          <InlineRows key={item.key} item={item} />
        ),
      )}
    </table>
  );
}
