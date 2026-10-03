import {
  CalendarCheck,
  Check,
  CircleSlash,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import { formatQuantity } from '../api/quantity';
import type { StockApi } from '../api/stock-api';
import type { StockItem, SupplySection } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import {
  BLANK_COUNT_ROW,
  buildCountItems,
  withMark,
  withTypedQuantity,
  type CountRowValues,
} from './count-form-values';
import { SectionedRows } from './SectionedRows';
import { SectionFilterBar } from './SectionFilterBar';
import { onlyDaily } from './supply-sections';
import { useSectionFilter } from './use-section-filter';

interface CountTabProps {
  stock: StockApi;
  items: StockItem[];
  /** Agrupa na ordem da prateleira; o que já foi digitado fica guardado ao trocar o filtro. */
  sections: SupplySection[];
  onSaved(): void;
}

type Mark = 'NOT_COUNTED' | 'NEEDS_PURCHASE';
/** "Precisa comprar" ligado fica mostarda (vai para a lista de compras); o outro, grafite. */
const MARKS: { mark: Mark; label: string; Icon: LucideIcon; tone: string }[] = [
  { mark: 'NOT_COUNTED', label: 'Não contado', Icon: CircleSlash, tone: '' },
  {
    mark: 'NEEDS_PURCHASE',
    label: 'Precisa comprar',
    Icon: ShoppingCart,
    tone: 'toggle-key-brand',
  },
];

interface CountRowProps {
  item: StockItem;
  row: CountRowValues;
  onChange(row: CountRowValues): void;
}

function CountRow({ item, row, onChange }: CountRowProps) {
  return (
    <tr data-filled={row.status !== null}>
      <td className="strong">{item.name}</td>
      <td className="num muted-cell">
        {formatQuantity(item.quantity)} {item.countUnit}
      </td>
      <td>
        <div className="count-input">
          <input
            className="cell-input cell-input-short"
            inputMode="decimal"
            aria-label={`Contagem de ${item.name}`}
            value={row.quantity}
            onChange={(event) =>
              onChange(withTypedQuantity(event.target.value))
            }
          />
          <span>{item.countUnit}</span>
        </div>
      </td>
      <td className="count-marks">
        {MARKS.map(({ mark, label, Icon, tone }) => (
          <button
            key={mark}
            type="button"
            className={`toggle-key toggle-key-sm ${tone}`}
            aria-pressed={row.status === mark}
            aria-label={`${label}: ${item.name}`}
            onClick={() => onChange(withMark(row, mark))}
          >
            <Icon aria-hidden />
            {label}
          </button>
        ))}
      </td>
    </tr>
  );
}

interface DailyToggleProps {
  on: boolean;
  count: number;
  onChange(on: boolean): void;
}

/** Atalho para os insumos de "contar todo dia" (marcados em Cadastros → Insumos). */
function DailyToggle({ on, count, onChange }: DailyToggleProps) {
  return (
    <button
      type="button"
      className="toggle-key toggle-key-brand"
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <CalendarCheck aria-hidden />
      Contagem do dia
      <span className="toggle-key-count">{count}</span>
    </button>
  );
}

function useCountForm({ stock, items, onSaved }: CountTabProps) {
  const [rows, setRows] = useState<Map<number, CountRowValues>>(new Map());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const setRow = (supplyId: number, row: CountRowValues) =>
    setRows((current) => new Map(current).set(supplyId, row));
  const nameOf = (id: number) =>
    items.find((i) => i.supplyId === id)?.name ?? `#${id}`;
  const submit = async () => {
    const built = buildCountItems(rows, nameOf);
    if (!built.ok) return setMessage({ ok: false, text: built.error });
    setSaving(true);
    try {
      await stock.saveCounts(built.value);
      setMessage({
        ok: true,
        text: `Contagem salva: ${built.value.length} insumos.`,
      });
      setRows(new Map());
      onSaved();
    } catch (failure) {
      setMessage({ ok: false, text: errorMessage(failure) });
    } finally {
      setSaving(false);
    }
  };
  const filled = [...rows.values()].filter((r) => r.status !== null).length;
  return { rows, setRow, submit, message, saving, filled };
}

/**
 * Contagem por sobrescrita: o número informado passa a ser o saldo. Linhas em branco
 * ficam fora; "Não contado" e "Precisa comprar" registram sem mexer no saldo.
 */
export function CountTab(props: CountTabProps) {
  const form = useCountForm(props);
  const [dailyOnly, setDailyOnly] = useState(false);
  const view = useSectionFilter(
    onlyDaily(props.items, dailyOnly),
    props.sections,
  );
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  if (props.items.length === 0)
    return (
      <EmptyState
        title="Nenhum insumo para contar"
        hint="O admin cadastra os insumos em Cadastros → Insumos."
      />
    );
  return (
    <form onSubmit={handleSubmit}>
      <p className="hint">
        O número digitado substitui o saldo do sistema (a diferença sai do lote
        que vence primeiro). Deixe em branco o que não foi contado hoje.
      </p>
      <SectionFilterBar
        sections={props.sections}
        filter={view.filter}
        counts={view.counts}
        onChange={view.setFilter}
        extra={
          <DailyToggle
            on={dailyOnly}
            count={onlyDaily(props.items, true).length}
            onChange={setDailyOnly}
          />
        }
      />
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table count-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="num">No sistema</th>
                <th>Contei</th>
                <th>Ou marque</th>
              </tr>
            </thead>
            <SectionedRows
              groups={view.groups}
              columnCount={4}
              renderRow={(item) => (
                <CountRow
                  key={item.supplyId}
                  item={item}
                  row={form.rows.get(item.supplyId) ?? BLANK_COUNT_ROW}
                  onChange={(row) => form.setRow(item.supplyId, row)}
                />
              )}
            />
          </table>
        </div>
      </div>
      <div className="count-footer">
        {form.message && (
          <p
            className={form.message.ok ? 'form-success' : 'form-error'}
            role="status"
          >
            {form.message.text}
          </p>
        )}
        <button
          className="button"
          type="submit"
          disabled={form.saving}
          aria-busy={form.saving}
        >
          <Check aria-hidden />
          {form.filled === 0
            ? 'Salvar contagem'
            : `Salvar contagem (${form.filled})`}
        </button>
      </div>
    </form>
  );
}
