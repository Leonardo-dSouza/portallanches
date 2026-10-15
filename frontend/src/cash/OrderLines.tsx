import { ListPlus, Minus, Plus, Undo2, X } from 'lucide-react';
import { formatAmount } from '../api/money';
import { lineLabel, type DraftLine } from './order-lines';
import { AddonPanel } from './AddonPanel';
import { addonChoices } from './addon-lookup';
import { treeOfDraft, type ItemTreeRow } from './item-tree';
import type { MenuItem } from './menu-lookup';
import type { AddonPanelState } from './use-addon-panel';
import type { OrderItemsState } from './use-order-items';
import { MenuNumberChip } from './MenuNumberChip';
import { lineMark, removedLines, type LineMark } from './edit-marks';
import { useCashShortcuts } from '../settings/app-settings-context';

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
  /** Na edição (2026-10-15): nova, +1/−1 ou alterada em relação ao salvo. */
  mark?: LineMark;
}

const MARK_TEXT = {
  new: () => 'novo',
  changed: () => 'alterado',
  quantity: (delta: number) => (delta > 0 ? `+${delta}` : `−${-delta}`),
};

/** Etiqueta da edição ao lado do nome. */
function EditMark({ mark }: { mark?: LineMark }) {
  if (!mark) return null;
  const text =
    mark.kind === 'quantity'
      ? MARK_TEXT.quantity(mark.delta)
      : MARK_TEXT[mark.kind]();
  return (
    <span className="edit-mark" data-kind={mark.kind}>
      {text}
    </span>
  );
}

function LineActions({ line, items, onOpenPanel }: LineActionsProps) {
  const shortcut = useCashShortcuts().addons;
  const change = (delta: number) => items.changeQuantity(line.id, delta);
  const label = lineLabel(items.lines, line);
  return (
    <span className="order-line-actions">
      {/* No Tab (ao contrário do −/+/×): o jeito visual de pôr adicional e observação. */}
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Adicionais e observação de ${label}`}
        title={`Adicionais e observação (${shortcut} na última linha)`}
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
  const { line, mark } = props;
  const [row] = treeOfDraft([line]);
  return (
    <li className="order-line" data-mark={mark?.kind}>
      <span className="order-line-quantity">{row.quantity}×</span>
      <span className="order-line-name">
        {line.menuNumber !== null && (
          <MenuNumberChip
            number={line.menuNumber}
            categoryName={line.categoryName}
          />
        )}
        {/* O nome encolhe primeiro: a etiqueta da edição e o "art." ficam à vista. */}
        <span className="order-line-name-text" title={row.name}>
          {row.name}
        </span>
        {/* "art." como na lista: a coluna do nome ficou estreita com o Unit. Com número, a ficha
            invertida já diz que é artesanal (2026-10-15) e o espaço vai para o nome. */}
        {row.artisanal && line.menuNumber === null && (
          <span
            className="order-item-category"
            data-artisanal
            title="Artesanal"
          >
            art.
          </span>
        )}
        <EditMark mark={mark} />
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
  /** Linhas do pedido como estava salvo (edição); vazio no pedido novo. */
  saved: DraftLine[];
}

/** Linhas do pedido salvo que saíram, riscadas, com Desfazer (edição, 2026-10-15). */
function RemovedLines({
  saved,
  items,
}: {
  saved: DraftLine[];
  items: OrderItemsState;
}) {
  const removed = removedLines(saved, items.lines);
  if (removed.length === 0) return null;
  return (
    <ul className="order-lines-removed" aria-label="Itens que saíram">
      {removed.map((line) => (
        <li key={line.savedId}>
          <span className="order-line-removed-name">
            {line.quantity}× {lineLabel(saved, line)}
          </span>
          <button
            type="button"
            className="button-ghost button-sm"
            aria-label={`Desfazer a saída de ${lineLabel(saved, line)}`}
            onClick={() => items.restoreLine(line)}
          >
            <Undo2 aria-hidden />
            Desfazer
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Linhas da comanda, como num cupom. O −/+/× ficam fora do Tab (o "+"/"-" do bloco numérico já
 * mexe na última linha); o botão de adicionais abre o painel embaixo da linha.
 */
export function OrderLines({ items, menu, panel, saved }: OrderLinesProps) {
  if (items.lines.length === 0)
    return (
      <>
        <p className="order-lines-empty">
          Nenhum item ainda: digite o número ou parte do nome.
        </p>
        <RemovedLines saved={saved} items={items} />
      </>
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
            mark={lineMark(line, saved)}
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
      <RemovedLines saved={saved} items={items} />
    </>
  );
}
