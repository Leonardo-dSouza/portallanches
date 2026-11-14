import type { InvoiceItem } from '../api/invoice-types';
import { formatAmount } from '../api/money';
import type { ItemSupplyLink } from '../api/purchase-types';
import { formatQuantity } from '../api/quantity';
import {
  groupInvoiceItems,
  type InvoiceItemGroup,
} from './invoice-item-groups';
import { formatBaseDiff } from './invoice-format';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  /** Posições fora da lanchonete (2026-10-25): etiqueta "Fora" e a linha apagada. */
  outside: ReadonlySet<number>;
  /** Código do produto cuja linha fica destacada (vindo do Histórico do produto). */
  highlightCode?: string;
  /** Com ela, cada linha ganha a caixinha "Fora"; sem ela, a nota é só para ler. */
  onToggle?(positions: number[]): void;
  /** Ação de ligar ou editar a ligação do item a um insumo do estoque. */
  onLink?(group: InvoiceItemGroup): void;
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
  onLink,
}: InvoiceItemsTableProps) {
  return (
    <div className="table-scroll">
      <table className="items-table invoice-items table-stack">
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
              onLink={onLink}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InvoiceItemRowProps {
  group: InvoiceItemGroup;
  isOutside: boolean;
  highlighted: boolean;
  onToggle?(positions: number[]): void;
  onLink?(group: InvoiceItemGroup): void;
}

function formatLinkChoice(link: ItemSupplyLink): string {
  if (!link.label) return 'unidade';
  const lower = link.label.toLowerCase();
  if (lower.includes(' de ') || lower.includes(link.baseQuantity)) {
    return link.label;
  }
  if (link.baseQuantity !== '1') {
    return `${link.label} de ${link.baseQuantity}`;
  }
  return link.label;
}

function ItemLinkAndAlert({
  group,
  onLink,
}: {
  group: InvoiceItemGroup;
  onLink?(group: InvoiceItemGroup): void;
}) {
  const { link, alert } = group;
  return (
    <div className="invoice-item-link-box mt-1 text-xs">
      {link ? (
        onLink ? (
          <button
            type="button"
            className="button-ghost p-0 font-medium text-brand hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onLink(group);
            }}
          >
            {`${link.supplyName} · ${formatLinkChoice(link)}`}
          </button>
        ) : (
          <span className="font-medium text-ink">
            {`${link.supplyName} · ${formatLinkChoice(link)}`}
          </span>
        )
      ) : onLink ? (
        <button
          type="button"
          className="button button-secondary button-sm py-0.5 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onLink(group);
          }}
        >
          Ligar a insumo
        </button>
      ) : null}
      {alert && (
        <div className="invoice-alert-row mt-0.5 text-muted">
          <span>{`Pago: ${alert.paidPerUnit.replace('.', ',')}`}</span>
          <span> · </span>
          <span>{`Base: ${alert.basePerUnit.replace('.', ',')}`}</span>
          <span> · </span>
          <span
            className={
              alert.above
                ? 'text-danger font-semibold'
                : 'text-success font-semibold'
            }
          >
            {formatBaseDiff(alert.diffPercent)}
          </span>
        </div>
      )}
    </div>
  );
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
  onLink,
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
      <td
        className="invoice-qty"
        data-label="Qtd"
      >{`${formatQuantity(group.quantity)} ${group.unit}`}</td>
      <td data-label="Produto">
        {group.description}
        {isOutside && <span className="invoice-outside-tag">Fora</span>}
        <small>cód. {group.code}</small>
        {!isOutside && (group.link || onLink) && (
          <ItemLinkAndAlert group={group} onLink={onLink} />
        )}
      </td>
      <td className="num" data-label="Unit.">
        {formatAmount(group.unitPrice)}
      </td>
      <td className="num" data-label="Total">
        {formatAmount(group.total)}
      </td>
    </tr>
  );
}
