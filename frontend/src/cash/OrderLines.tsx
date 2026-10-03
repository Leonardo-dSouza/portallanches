import { Minus, Plus, X } from 'lucide-react';
import { formatMoney } from '../api/money';
import { lineTotal, type DraftLine } from './order-lines';
import type { OrderItemsState } from './use-order-items';

function LineRow({ line, items }: { line: DraftLine; items: OrderItemsState }) {
  const change = (delta: number) => items.changeQuantity(line.productId, delta);
  return (
    <li className="order-line">
      <span className="order-line-quantity">{line.quantity}×</span>
      <span className="order-line-name">
        {line.menuNumber !== null && (
          <span className="menu-number-chip">{line.menuNumber}</span>
        )}
        {line.name}
        {line.categoryName === 'Artesanal' && (
          <span className="order-item-category">Artesanal</span>
        )}
      </span>
      <span className="order-line-total">{formatMoney(lineTotal(line))}</span>
      <span className="order-line-actions">
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Menos um ${line.name}`}
          tabIndex={-1}
          onClick={() => change(-1)}
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Mais um ${line.name}`}
          tabIndex={-1}
          onClick={() => change(1)}
        >
          <Plus aria-hidden />
        </button>
        <button
          type="button"
          className="button-ghost button-sm button-danger"
          aria-label={`Tirar ${line.name}`}
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
        <LineRow key={line.productId} line={line} items={items} />
      ))}
    </ul>
  );
}
