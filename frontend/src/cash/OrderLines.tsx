import { ListPlus, Minus, Plus, X } from 'lucide-react';
import { formatAmount } from '../api/money';
import { lineLabel, type DraftLine } from './order-lines';
import { AddonPanel } from './AddonPanel';
import { addonChoices } from './addon-lookup';
import { treeOfDraft, type ItemTreeRow } from './item-tree';
import type { MenuItem } from './menu-lookup';
import type { AddonPanelState } from './use-addon-panel';
import type { OrderItemsState } from './use-order-items';

/** Unitário e total na grade da linha (sem "R$": a coluna já diz que é dinheiro). */
function PriceCells({ unit, total }: { unit: string; total: string }) {
  return (
    <>
      <span className="order-line-unit">{formatAmount(unit)}</span>
      <span className="order-line-total">{formatAmount(total)}</span>
    </>
  );
}

/** Adicionais com o preço deles e a observação, nas linhas de baixo da mesma grade. */
function LineDetails({ row }: { row: ItemTreeRow }) {
  return (
    <>
      {row.addons.map((addon) => (
        <span key={addon.key} className="order-line-addon">
          <span className="order-line-addon-label">{addon.label}</span>
          <PriceCells unit={addon.unitPrice} total={addon.total} />
        </span>
      ))}
      {row.note && <span className="order-line-note">{row.note}</span>}
    </>
  );
}

interface LineActionsProps {
  line: DraftLine;
  items: OrderItemsState;
  onOpenPanel(lineId: number): void;
}

function LineActions({ line, items, onOpenPanel }: LineActionsProps) {
  const change = (delta: number) => items.changeQuantity(line.id, delta);
  const label = lineLabel(items.lines, line);
  return (
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
  );
}

/**
 * Uma linha da comanda em colunas (pedido do usuário, 2026-10-10): Qtd, Item, Unit., Total e
 * os botões; os adicionais, com o preço deles, e a observação vêm embaixo, na mesma grade.
 */
function LineRow(props: LineActionsProps) {
  const { line } = props;
  const [row] = treeOfDraft([line]);
  return (
    <li className="order-line">
      <span className="order-line-quantity">{row.quantity}×</span>
      <span className="order-line-name">
        {line.menuNumber !== null && (
          <span className="menu-number-chip">{line.menuNumber}</span>
        )}
        {row.name}
        {/* "art." como na lista: a coluna do nome ficou estreita com o Unit. */}
        {row.artisanal && (
          <span className="order-item-category" title="Artesanal">
            art.
          </span>
        )}
      </span>
      <PriceCells unit={row.unitPrice} total={row.total} />
      <LineActions {...props} />
      <LineDetails row={row} />
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
    <>
      <div className="order-lines-head" aria-hidden="true">
        <span>Qtd</span>
        <span>Item</span>
        <span>Unit.</span>
        <span>Total</span>
      </div>
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
    </>
  );
}
