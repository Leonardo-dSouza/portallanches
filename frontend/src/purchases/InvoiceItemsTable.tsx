import type { InvoiceItem } from '../api/invoice-types';
import { formatAmount } from '../api/money';
import { formatQuantity } from '../api/quantity';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  /** Posições fora da lanchonete (2026-10-25): etiqueta "Fora" e a linha apagada. */
  outside: ReadonlySet<number>;
  /** Código do produto cuja linha fica destacada (vindo do Histórico do produto). */
  highlightCode?: string;
  /** Com ela, cada linha ganha a caixinha "Fora"; sem ela, a nota é só para ler. */
  onToggle?(position: number): void;
}

/**
 * Os itens da nota em colunas, como no cupom: Qtd, Produto, Unit. e Total.
 *
 * @example <InvoiceItemsTable items={invoice.items} outside={new Set([9])} onToggle={toggle} />
 */
export function InvoiceItemsTable({
  items,
  outside,
  highlightCode,
  onToggle,
}: InvoiceItemsTableProps) {
  return (
    <table className="items-table invoice-items">
      <thead>
        <tr>
          {onToggle && <th>Fora</th>}
          <th>Qtd</th>
          <th>Produto</th>
          <th className="num">Unit.</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <InvoiceItemRow
            key={item.position}
            item={item}
            isOutside={outside.has(item.position)}
            highlighted={item.code === highlightCode}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  );
}

interface InvoiceItemRowProps {
  item: InvoiceItem;
  isOutside: boolean;
  highlighted: boolean;
  onToggle?(position: number): void;
}

/**
 * Uma linha da nota. Para marcar, o clique vale na linha inteira (pedido do usuário, 2026-10-25:
 * a caixinha sozinha era pequena demais); a caixinha fica como sinal e para o teclado.
 */
function InvoiceItemRow({
  item,
  isOutside,
  highlighted,
  onToggle,
}: InvoiceItemRowProps) {
  return (
    <tr
      className="items-table-item"
      data-highlight={highlighted}
      data-outside={isOutside}
      data-clickable={onToggle !== undefined}
      onClick={onToggle && (() => onToggle(item.position))}
    >
      {onToggle && (
        <td className="invoice-outside-check">
          <input
            type="checkbox"
            checked={isOutside}
            aria-label={`Fora da lanchonete: ${item.description}`}
            onChange={() => onToggle(item.position)}
            // O clique na caixinha já troca a marca; sem isto, a linha trocaria de novo.
            onClick={(event) => event.stopPropagation()}
          />
        </td>
      )}
      <td className="invoice-qty">{`${formatQuantity(item.quantity)} ${item.unit}`}</td>
      <td>
        {item.description}
        {isOutside && <span className="invoice-outside-tag">Fora</span>}
        <small>cód. {item.code}</small>
      </td>
      <td className="num">{formatAmount(item.unitPrice)}</td>
      <td className="num">{formatAmount(item.total)}</td>
    </tr>
  );
}
