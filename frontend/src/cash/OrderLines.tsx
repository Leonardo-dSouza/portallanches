import { ListPlus, Minus, Plus, X } from 'lucide-react';
import { formatMoney } from '../api/money';
import { lineLabel, lineTotal, type DraftLine } from './order-lines';
import { AddonPanel } from './AddonPanel';
import { addonChoices } from './addon-lookup';
import { treeOfDraft } from './item-tree';
import type { MenuItem } from './menu-lookup';
import type { AddonPanelState } from './use-addon-panel';
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

interface LineRowProps {
  line: DraftLine;
  items: OrderItemsState;
  onOpenPanel(lineId: number): void;
}

function LineRow({ line, items, onOpenPanel }: LineRowProps) {
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
        {/* No Tab (ao contrário do −/+/×): o jeito visual de pôr adicional e observação. */}
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Adicionais e observação de ${label}`}
          title="Adicionais e observação (F4 na última linha)"
          onClick={() => onOpenPanel(line.id)}
        >
          <ListPlus aria-hidden />
        </button>
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

interface OrderLinesProps {
  items: OrderItemsState;
  /** Cardápio do dia, para os adicionais que cada linha aceita. */
  menu: MenuItem[];
  panel: AddonPanelState;
}

/**
 * Linhas da comanda, como num cupom. O −/+/× ficam fora do Tab (o "+"/"-" do bloco numérico já
 * mexe na última linha); o botão de adicionais abre o painel embaixo da linha.
 */
export function OrderLines({ items, menu, panel }: OrderLinesProps) {
  if (items.lines.length === 0)
    return (
      <p className="order-lines-empty">
        Nenhum item ainda. Digite o número do lanche ou parte do nome.
      </p>
    );
  return (
    <ul className="order-lines" aria-label="Itens do pedido">
      {items.lines.flatMap((line) => [
        <LineRow
          key={line.id}
          line={line}
          items={items}
          onOpenPanel={panel.open}
        />,
        ...(panel.lineId === line.id
          ? [
              <li key={`painel-${line.id}`} className="order-line-panel">
                <AddonPanel
                  line={line}
                  choices={addonChoices(menu, line)}
                  items={items}
                  onClose={panel.close}
                />
              </li>,
            ]
          : []),
      ])}
    </ul>
  );
}
