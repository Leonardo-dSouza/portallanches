import type { InvoiceItem } from '../api/invoice-types';
import { formatAmount } from '../api/money';
import { formatQuantity } from '../api/quantity';
import {
  groupInvoiceItems,
  type InvoiceItemGroup,
} from './invoice-item-groups';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  /** Posições fora da lanchonete (2026-10-25): etiqueta "Fora" e a linha apagada. */
  outside: ReadonlySet<number>;
  /** Código do produto cuja linha fica destacada (vindo do Histórico do produto). */
  highlightCode?: string;
  /** Com ela, cada linha ganha a caixinha "Fora"; sem ela, a nota é só para ler. */
  onToggle?(positions: number[]): void;
}

/**
 * Os itens da nota em colunas: Qtd, Produto, Unit. e Total. O cupom repete o produto a cada
 * unidade passada no caixa; aqui as linhas iguais vêm juntas (2026-10-30: 8 latas em 8 linhas).
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
        {groupInvoiceItems(items, outside).map((group) => (
          <InvoiceItemRow
            key={group.key}
            group={group}
            isOutside={outside.has(group.positions[0])}
            highlighted={group.code === highlightCode}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  );
}

interface InvoiceItemRowProps {
  group: InvoiceItemGroup;
  isOutside: boolean;
  highlighted: boolean;
  onToggle?(positions: number[]): void;
}

/**
 * Uma linha da nota. Para marcar, o clique vale na linha inteira (pedido do usuário, 2026-10-25:
 * a caixinha sozinha era pequena demais); a caixinha fica como sinal e para o teclado. A marca
 * vale para todas as linhas da nota que ela junta.
 */
function InvoiceItemRow({
  group,
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
      onClick={onToggle && (() => onToggle(group.positions))}
    >
      {onToggle && (
        <td className="invoice-outside-check">
          <input
            type="checkbox"
            checked={isOutside}
            aria-label={`Fora da lanchonete: ${group.description}`}
            onChange={() => onToggle(group.positions)}
            // O clique na caixinha já troca a marca; sem isto, a linha trocaria de novo.
            onClick={(event) => event.stopPropagation()}
          />
        </td>
      )}
      <td className="invoice-qty">{`${formatQuantity(group.quantity)} ${group.unit}`}</td>
      <td>
        {group.description}
        {isOutside && <span className="invoice-outside-tag">Fora</span>}
        <small>cód. {group.code}</small>
      </td>
      <td className="num">{formatAmount(group.unitPrice)}</td>
      <td className="num">{formatAmount(group.total)}</td>
    </tr>
  );
}
