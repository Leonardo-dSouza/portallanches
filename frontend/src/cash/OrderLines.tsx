import { Minus, Plus, X } from 'lucide-react';
import { formatMoney } from '../api/money';
import { lineLabel, lineTotal, type DraftLine } from './order-lines';
import { treeOfDraft } from './item-tree';
import type { OrderItemsState } from './use-order-items';

/** Adicionais e observação embaixo do nome, como na comanda. */
function LineDetails({ line }: { line: DraftLine }) {
  const [row] = treeOfDraft([line]);
  if (row.details.length === 0) return null;
  return (
    <ul className="item-tree-details order-line-details">
      {row.details.map((detail, index) => (
        <li key={index}>{detail}</li>
      ))}
    </ul>
  );
}

function LineRow({ line, items }: { line: DraftLine; items: OrderItemsState }) {
  const change = (delta: number) => items.changeQuantity(line.id, delta);
  const label = lineLabel(items.lines, line);
  return (
    <li className="order-line">
      <span className="order-line-quantity">{line.quantity}×</span>
      <div className="order-line-main">
        <span className="order-line-name">
          {line.menuNumber !== null && (
            <span className="menu-number-chip">{line.menuNumber}</span>
          )}
          {line.name}
          {line.categoryName === 'Artesanal' && (
            <span className="order-item-category">Artesanal</span>
          )}
        </span>
        <LineDetails line={line} />
      </div>
      <span className="order-line-total">{formatMoney(lineTotal(line))}</span>
      <span className="order-line-actions">
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Menos um ${label}`}
          tabIndex={-1}
          onClick={() => change(-1)}
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Mais um ${label}`}
          tabIndex={-1}
          onClick={() => change(1)}
        >
          <Plus aria-hidden />
        </button>
        <button
          type="button"
          className="button-ghost button-sm button-danger"
          aria-label={`Tirar ${label}`}
          tabIndex={-1}
          onClick={() => change(-line.quantity)}
        >
          <X aria-hidden />
        </button>
      </span>
    </li>
  );
}

/**
 * Linhas da comanda, como num cupom. Os botões ficam fora do Tab: no teclado, o "+"/"-" do
 * bloco numérico já mexe na última linha.
 */
export function OrderLines({ items }: { items: OrderItemsState }) {
  if (items.lines.length === 0)
    return (
      <p className="order-lines-empty">
        Nenhum item ainda. Digite o número do lanche ou parte do nome.
      </p>
    );
  return (
    <ul className="order-lines" aria-label="Itens do pedido">
      {items.lines.map((line) => (
        <LineRow key={line.id} line={line} items={items} />
      ))}
    </ul>
  );
}
