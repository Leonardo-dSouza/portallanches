import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createPurchaseApi } from '../api/purchase-api';
import type { ItemSupplyLink } from '../api/purchase-types';
import { createSupplyApi } from '../api/supply-api';
import type { Supply } from '../api/types';
import { Dialog } from '../components/Dialog';
import { SearchField } from '../components/SearchField';
import {
  formatChoiceLabel,
  packageChoices,
  type BasePriceChoice,
} from '../costs/base-price-values';

/** Propriedades do diálogo de vinculação de item da nota ao insumo. */
export interface LinkSupplyDialogProps {
  vendorId: number;
  item: {
    code: string;
    description: string;
    link?: ItemSupplyLink | null;
  };
  onSaved(): void;
  onClose(): void;
}

function useSupplyList() {
  const api = useApi();
  const supplyApi = useMemo(() => createSupplyApi(api), [api]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  useEffect(() => {
    let active = true;
    supplyApi.listSupplies().then((list) => {
      if (active) setSupplies(list.filter((s) => s.active));
    });
    return () => {
      active = false;
    };
  }, [supplyApi]);
  return supplies;
}

function resolveInitialChoice(
  link: ItemSupplyLink | null | undefined,
  supply: Supply | undefined,
): BasePriceChoice {
  if (link) {
    return { label: link.label, quantity: link.baseQuantity };
  }
  if (!supply) return { label: null, quantity: '1' };
  return packageChoices(supply)[0];
}

interface DialogFormProps {
  supplies: Supply[];
  vendorId: number;
  item: LinkSupplyDialogProps['item'];
  onSaved(): void;
  onClose(): void;
}

function FormControls(props: {
  supplies: Supply[];
  selectedSupplyId: number | null;
  choice: BasePriceChoice;
  query: string;
  onQuery(q: string): void;
  onSelectSupply(id: number | null): void;
  onSelectChoice(c: BasePriceChoice): void;
}) {
  const {
    supplies,
    selectedSupplyId,
    choice,
    query,
    onQuery,
    onSelectSupply,
    onSelectChoice,
  } = props;
  const filtered = supplies.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = supplies.find((s) => s.id === selectedSupplyId);
  const choices = selected ? packageChoices(selected) : [];

  return (
    <div className="flow-vertical gap-4">
      <SearchField
        label="Buscar insumo"
        placeholder="Nome do insumo"
        value={query}
        onChange={onQuery}
      />
      <div>
        <label htmlFor="link-supply-select" className="label block mb-1">
          Insumo
        </label>
        <select
          id="link-supply-select"
          className="cell-select w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          aria-label="Insumo"
          value={selectedSupplyId ?? ''}
          onChange={(e) =>
            onSelectSupply(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Selecione um insumo…</option>
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div>
          <label htmlFor="link-package-select" className="label block mb-1">
            Embalagem
          </label>
          <select
            id="link-package-select"
            className="cell-select w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
            aria-label="Embalagem"
            value={choice.label ?? '__unit__'}
            onChange={(e) => {
              const val = e.target.value;
              const found = choices.find(
                (c) => (c.label ?? '__unit__') === val,
              );
              if (found) onSelectChoice(found);
            }}
          >
            {choices.map((c) => (
              <option key={c.label ?? '__unit__'} value={c.label ?? '__unit__'}>
                {formatChoiceLabel(c, selected.countUnit)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function DialogButtons(props: {
  hasExistingLink: boolean;
  canSave: boolean;
  saving: boolean;
  onUnlink(): void;
  onSave(): void;
}) {
  const { hasExistingLink, canSave, saving, onUnlink, onSave } = props;
  return (
    <div className="dialog-actions">
      {hasExistingLink && (
        <button
          type="button"
          className="button button-danger mr-auto"
          disabled={saving}
          onClick={onUnlink}
        >
          <Trash2 aria-hidden />
          Desligar
        </button>
      )}
      <button
        type="button"
        className="button button-primary"
        disabled={!canSave || saving}
        aria-busy={saving}
        onClick={onSave}
      >
        Gravar
      </button>
    </div>
  );
}

function LinkForm({
  supplies,
  vendorId,
  item,
  onSaved,
  onClose,
}: DialogFormProps) {
  const api = useApi();
  const purchases = useMemo(() => createPurchaseApi(api), [api]);
  const [query, setQuery] = useState('');
  const [supplyId, setSupplyId] = useState<number | null>(
    item.link?.supplyId ?? null,
  );
  const selected = supplies.find((s) => s.id === supplyId);
  const [choice, setChoice] = useState<BasePriceChoice>(() =>
    resolveInitialChoice(item.link, selected),
  );
  const [saving, setSaving] = useState(false);

  const handleSelectSupply = (id: number | null) => {
    setSupplyId(id);
    const nextSupply = supplies.find((s) => s.id === id);
    setChoice(resolveInitialChoice(item.link, nextSupply));
  };

  const handleSave = async () => {
    if (!supplyId) return;
    setSaving(true);
    await purchases.saveItemLink({
      vendorId,
      code: item.code,
      supplyId,
      baseQuantity: choice.quantity,
      label: choice.label,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleUnlink = async () => {
    setSaving(true);
    await purchases.deleteItemLink(vendorId, item.code);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <>
      <FormControls
        supplies={supplies}
        selectedSupplyId={supplyId}
        choice={choice}
        query={query}
        onQuery={setQuery}
        onSelectSupply={handleSelectSupply}
        onSelectChoice={setChoice}
      />
      <DialogButtons
        hasExistingLink={Boolean(item.link)}
        canSave={Boolean(supplyId)}
        saving={saving}
        onUnlink={handleUnlink}
        onSave={handleSave}
      />
    </>
  );
}

/**
 * Diálogo para ligar um item da nota fiscal a um insumo do estoque.
 *
 * @example <LinkSupplyDialog vendorId={1} item={row} onSaved={reload} onClose={close} />
 */
export function LinkSupplyDialog(props: LinkSupplyDialogProps) {
  const { item, onClose } = props;
  const supplies = useSupplyList();

  return (
    <Dialog title="Ligar a insumo" onClose={onClose}>
      <p className="hint mb-4">{`${item.description} (cód. ${item.code})`}</p>
      <LinkForm {...props} supplies={supplies} />
    </Dialog>
  );
}
