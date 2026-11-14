import { PackagePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/api-client';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';
import { createPurchaseApi } from '../api/purchase-api';
import type { PurchaseInvoiceItemRow } from '../api/purchase-types';
import { Dialog } from '../components/Dialog';
import { toDateKey } from '../history/date-keys';
import {
  buildInvoiceStockEntryPayload,
  formatStockEntryButtonLabel,
  formatStockEntryConversion,
  initialStockEntryItemIds,
} from './invoice-stock-entry';
import { LinkSupplyDialog } from './LinkSupplyDialog';

/** Propriedades da janela de lançamento de itens da nota fiscal no estoque. */
export interface InvoiceStockEntryDialogProps {
  invoiceId: number;
  vendorId: number;
  issuedAt: string;
  items: PurchaseInvoiceItemRow[];
  onSuccess?(result?: unknown): void;
  onReload?(): Promise<unknown> | void;
  onClose(): void;
}

interface ItemRowProps {
  item: PurchaseInvoiceItemRow;
  checked: boolean;
  expiresOn: string;
  onToggle(id: number): void;
  onDateChange(id: number, date: string): void;
  onOpenLink(item: PurchaseInvoiceItemRow): void;
}

function ItemCheckCell({
  item,
  checked,
  onToggle,
}: Pick<ItemRowProps, 'item' | 'checked' | 'onToggle'>) {
  const itemId = item.id;
  if (item.outsideBusiness) {
    return <td className="w-10" />;
  }
  if (!item.link) {
    return (
      <td className="w-10">
        <input
          type="checkbox"
          disabled
          checked={false}
          aria-label={`Item sem ligação: ${item.description}`}
        />
      </td>
    );
  }
  return (
    <td className="w-10">
      <input
        type="checkbox"
        checked={checked}
        aria-label={`Selecionar ${item.description}`}
        onChange={() => onToggle(itemId)}
      />
    </td>
  );
}

function ItemSupplyCell({
  item,
  onOpenLink,
}: Pick<ItemRowProps, 'item' | 'onOpenLink'>) {
  if (item.outsideBusiness) {
    return <td data-label="Insumo no estoque">—</td>;
  }
  if (!item.link) {
    return (
      <td data-label="Insumo no estoque">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={() => onOpenLink(item)}
        >
          Ligar a insumo
        </button>
      </td>
    );
  }
  return (
    <td data-label="Insumo no estoque">
      <div>
        <button
          type="button"
          className="button-ghost p-0 font-medium text-brand hover:underline text-left"
          onClick={() => onOpenLink(item)}
        >
          {item.link.supplyName}
        </button>
        <div className="text-xs text-muted font-medium">
          {formatStockEntryConversion(
            item.quantity,
            item.unit,
            item.link.baseQuantity,
          )}
        </div>
      </div>
    </td>
  );
}

function ItemExpiresCell({
  item,
  expiresOn,
  onDateChange,
}: Pick<ItemRowProps, 'item' | 'expiresOn' | 'onDateChange'>) {
  const itemId = item.id;
  if (item.outsideBusiness || !item.link) {
    return <td data-label="Validade">—</td>;
  }
  return (
    <td data-label="Validade">
      <input
        type="date"
        className="cell-input rounded-control border border-line bg-surface px-2 py-1 text-sm text-ink"
        aria-label={`Validade: ${item.description}`}
        value={expiresOn}
        onChange={(e) => onDateChange(itemId, e.target.value)}
      />
    </td>
  );
}

function StockEntryItemRow(props: ItemRowProps) {
  const { item, checked, expiresOn, onToggle, onDateChange, onOpenLink } =
    props;
  return (
    <tr
      className={
        item.outsideBusiness ? 'text-muted line-through' : 'items-table-item'
      }
    >
      <ItemCheckCell item={item} checked={checked} onToggle={onToggle} />
      <td data-label="Item">
        <span className={item.outsideBusiness ? 'line-through' : ''}>
          {item.description}
        </span>
        {item.outsideBusiness && (
          <span className="invoice-outside-tag ml-2">Fora</span>
        )}
        <small className="block text-xs text-muted tabular-nums">
          {`cód. ${item.code} · ${item.quantity} ${item.unit}`}
        </small>
      </td>
      <ItemSupplyCell item={item} onOpenLink={onOpenLink} />
      <ItemExpiresCell
        item={item}
        expiresOn={expiresOn}
        onDateChange={onDateChange}
      />
    </tr>
  );
}

/**
 * Diálogo para lançar os itens da nota fiscal de compra como lotes no estoque.
 *
 * @example <InvoiceStockEntryDialog invoiceId={10} vendorId={1} issuedAt="2026-11-14" items={items} onClose={close} />
 */
export function InvoiceStockEntryDialog(props: InvoiceStockEntryDialogProps) {
  const {
    invoiceId,
    vendorId,
    issuedAt,
    items: initialItems,
    onSuccess,
    onReload,
    onClose,
  } = props;
  const api = useApi();
  const purchases = useMemo(() => createPurchaseApi(api), [api]);

  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [items, setItems] = useState<PurchaseInvoiceItemRow[]>(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialStockEntryItemIds(initialItems)),
  );
  const [expiresByItem, setExpiresByItem] = useState<Record<number, string>>(
    {},
  );
  const [linkingItem, setLinkingItem] = useState<PurchaseInvoiceItemRow | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDateChange = (id: number, date: string) => {
    setExpiresByItem((prev) => ({ ...prev, [id]: date }));
  };

  const handleLinkSaved = async () => {
    if (linkingItem) {
      const newlyLinkedId = linkingItem.id;
      try {
        const dateStr = toDateKey(new Date(issuedAt));
        const list = await purchases.invoices({ from: dateStr, to: dateStr });
        const found = list.find((inv) => inv.id === invoiceId);
        if (found?.items) setItems(found.items);
      } catch {
        // Ignora erro de recarga local se a API de lista falhar
      }
      setSelectedIds((prev) => new Set([...prev, newlyLinkedId]));
    }
    if (onReload) await onReload();
    setLinkingItem(null);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildInvoiceStockEntryPayload(selectedIds, expiresByItem);
      const result = await purchases.enterStock(invoiceId, payload);
      onSuccess?.(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Esta nota já foi lançada no estoque.');
        if (onReload) await onReload();
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog title="Lançar no estoque" onClose={onClose} wide>
        {error && (
          <p className="form-error mb-4" role="alert">
            {error}
          </p>
        )}
        <p className="hint mb-4">
          Selecione os itens da lanchonete a dar entrada. Apenas itens ligados a
          insumos podem ser lançados.
        </p>
        <div className="table-scroll max-h-[60vh] overflow-y-auto mb-4">
          <table className="table table-stack">
            <thead>
              <tr>
                <th className="w-10">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th>Item</th>
                <th>Insumo no estoque</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const itemId = item.id;
                return (
                  <StockEntryItemRow
                    key={itemId}
                    item={item}
                    checked={selectedIds.has(itemId)}
                    expiresOn={expiresByItem[itemId] ?? ''}
                    onToggle={handleToggle}
                    onDateChange={handleDateChange}
                    onOpenLink={setLinkingItem}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={selectedIds.size === 0 || saving}
            aria-busy={saving}
            onClick={handleSubmit}
          >
            <PackagePlus aria-hidden />
            {saving
              ? 'Lançando…'
              : formatStockEntryButtonLabel(selectedIds.size)}
          </button>
        </div>
      </Dialog>
      {linkingItem && (
        <LinkSupplyDialog
          vendorId={vendorId}
          item={linkingItem}
          onSaved={handleLinkSaved}
          onClose={() => setLinkingItem(null)}
        />
      )}
    </>
  );
}
