import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';
import { formatAmount } from '../api/money';
import type { ItemSupplyLink, LinkProduct } from '../api/purchase-types';
import { formatQuantity } from '../api/quantity';
import { createSupplyApi } from '../api/supply-api';
import type { Supply } from '../api/types';
import { Dialog } from '../components/Dialog';
import { Skeleton } from '../components/Skeleton';
import { TextField } from '../components/TextField';
import {
  formatChoiceLabel,
  type BasePriceChoice,
} from '../costs/base-price-values';
import { linkChoices } from './item-link-values';
import { LinkPreviewBox } from './LinkPreviewBox';
import { supplyCandidates } from './supply-suggestion';
import { SupplyPickList } from './SupplyPickList';
import { useItemLinkForm } from './use-item-link-form';

/** Item da nota que se liga a um insumo (um item agrupado da nota ou uma linha da entrada). */
export interface LinkableItem {
  code: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  link?: ItemSupplyLink | null;
}

/** Propriedades do diálogo de vinculação de item da nota ao insumo. */
export interface LinkSupplyDialogProps {
  vendorId: number;
  item: LinkableItem;
  onSaved(): void;
  onClose(): void;
}

interface SupplyListState {
  supplies: Supply[] | null;
  error: string | null;
}

function useSupplyList(): SupplyListState {
  const api = useApi();
  const supplyApi = useMemo(() => createSupplyApi(api), [api]);
  const [state, setState] = useState<SupplyListState>({
    supplies: null,
    error: null,
  });
  useEffect(() => {
    let active = true;
    supplyApi.listSupplies().then(
      (list) =>
        active &&
        setState({ supplies: list.filter((s) => s.active), error: null }),
      (failure) =>
        active && setState({ supplies: null, error: errorMessage(failure) }),
    );
    return () => {
      active = false;
    };
  }, [supplyApi]);
  return state;
}

/**
 * Diálogo para ligar um item da nota fiscal a um insumo do estoque. Redesenhado em 2026-11-14
 * (pedido do usuário): lista única com busca e sugestão, a conta antes de gravar, Cancelar e
 * o aviso quando a gravação falha.
 *
 * @example <LinkSupplyDialog vendorId={1} item={row} onSaved={reload} onClose={close} />
 */
export function LinkSupplyDialog(props: LinkSupplyDialogProps) {
  const { item, onClose } = props;
  const { supplies, error } = useSupplyList();
  return (
    <Dialog title="Ligar a insumo" onClose={onClose} className="link-dialog">
      <ItemSummary item={item} />
      {error && (
        <p className="form-error" role="alert">
          {`Não deu para carregar os insumos: ${error}`}
        </p>
      )}
      {!error && !supplies && (
        <Skeleton label="Carregando os insumos…" rows={4} />
      )}
      {supplies && <LinkForm {...props} supplies={supplies} />}
    </Dialog>
  );
}

function ItemSummary({ item }: { item: LinkableItem }) {
  const bought = `${formatQuantity(item.quantity)} ${item.unit} × R$ ${formatAmount(item.unitPrice)}`;
  return (
    <div className="link-item">
      <p className="link-item-name">{item.description}</p>
      <p className="hint">{`cód. ${item.code} · na nota: ${bought}`}</p>
    </div>
  );
}

function LinkForm({
  vendorId,
  item,
  supplies,
  onSaved,
  onClose,
}: LinkSupplyDialogProps & { supplies: Supply[] }) {
  const [query, setQuery] = useState('');
  const form = useItemLinkForm({
    vendorId,
    code: item.code,
    description: item.description,
    link: item.link,
    supplies,
    onSaved,
    onClose,
  });
  const candidates = supplyCandidates(supplies, query, item.description);
  return (
    <>
      <SupplyPickList
        candidates={candidates}
        selectedId={form.supply?.id ?? null}
        query={query}
        onQuery={setQuery}
        onSelect={form.selectSupply}
      />
      {form.supply && (
        <ProductNameField
          value={form.productName}
          options={form.productOptions}
          onChange={form.setProductName}
        />
      )}
      {form.supply && form.choice && (
        <PackageAndPreview
          item={item}
          supply={form.supply}
          choice={form.choice}
          onChoice={form.setChoice}
        />
      )}
      {form.problem && (
        <p className="form-error" role="alert">
          {form.problem}
        </p>
      )}
      <LinkActions
        hasLink={Boolean(item.link)}
        canSave={Boolean(form.supply && form.choice)}
        saving={form.saving}
        onUnlink={form.unlink}
        onCancel={onClose}
        onSave={form.save}
      />
    </>
  );
}

/**
 * Produto com a marca ("Bacon Seara kg"): o mesmo nome junta o produto de mercados diferentes no
 * insumo, em Compras → Preços → Por insumo (2026-11-18).
 */
function ProductNameField(props: {
  value: string;
  options: LinkProduct[];
  onChange(value: string): void;
}) {
  return (
    <div className="link-product">
      <TextField
        label="Produto (com a marca)"
        value={props.value}
        list="link-product-options"
        maxLength={60}
        onChange={props.onChange}
      />
      <datalist id="link-product-options">
        {props.options.map((option) => (
          <option key={option.productName} value={option.productName} />
        ))}
      </datalist>
      <p className="hint">
        Use o mesmo nome em todo mercado: é ele que junta os preços.
      </p>
    </div>
  );
}

function PackageAndPreview({
  item,
  supply,
  choice,
  onChoice,
}: {
  item: LinkableItem;
  supply: Supply;
  choice: BasePriceChoice;
  onChoice(choice: BasePriceChoice): void;
}) {
  const saved =
    item.link?.supplyId === supply.id
      ? { label: item.link.label, quantity: item.link.baseQuantity }
      : null;
  return (
    <>
      <fieldset className="choice link-packages">
        <legend>{`Na nota, 1 ${item.unit} é`}</legend>
        {linkChoices(supply, saved).map((option) => (
          <label key={`${option.label}|${option.quantity}`}>
            <input
              type="radio"
              name="link-package"
              checked={
                option.label === choice.label &&
                Number(option.quantity) === Number(choice.quantity)
              }
              onChange={() => onChoice(option)}
            />
            {formatChoiceLabel(option, supply.countUnit)}
          </label>
        ))}
      </fieldset>
      <LinkPreviewBox
        unitPrice={item.unitPrice}
        unit={item.unit}
        supply={supply}
        choice={choice}
      />
    </>
  );
}

function LinkActions(props: {
  hasLink: boolean;
  canSave: boolean;
  saving: boolean;
  onUnlink(): void;
  onCancel(): void;
  onSave(): void;
}) {
  const { hasLink, canSave, saving } = props;
  return (
    <div className="dialog-actions">
      {hasLink && (
        <button
          type="button"
          className="button button-danger mr-auto"
          disabled={saving}
          onClick={props.onUnlink}
        >
          <Trash2 aria-hidden />
          Desligar
        </button>
      )}
      <button
        type="button"
        className="button button-secondary"
        onClick={props.onCancel}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="button"
        disabled={!canSave || saving}
        aria-busy={saving}
        onClick={props.onSave}
      >
        {saving ? 'Gravando…' : 'Gravar'}
      </button>
    </div>
  );
}
