import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { StockApi } from '../api/stock-api';
import type { Supply, SupplySection } from '../api/types';
import {
  BLANK_ENTRY_ROW,
  buildEntryItems,
  isRowTouched,
  type EntryRowValues,
} from './entry-form-values';
import { EntryGridRow } from './EntryGridRow';
import { EntryHistory } from './EntryHistory';
import { SectionedRows } from './SectionedRows';
import { SectionFilterBar } from './SectionFilterBar';
import { useEntryHistory } from './use-entry-history';
import { useSectionFilter } from './use-section-filter';

interface EntryTabProps {
  stock: StockApi;
  supplies: Supply[];
  sections: SupplySection[];
  onSaved(): void;
}

type Message = { ok: boolean; text: string } | null;

const describeCount = (n: number): string =>
  n === 1 ? '1 insumo' : `${n} insumos`;

function useEntryGrid({ stock, supplies, onSaved }: EntryTabProps) {
  const [rows, setRows] = useState<Map<number, EntryRowValues>>(new Map());
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const setRow = (supplyId: number, row: EntryRowValues) =>
    setRows((current) => new Map(current).set(supplyId, row));
  const nameOf = (id: number) =>
    supplies.find((s) => s.id === id)?.name ?? `#${id}`;
  const submit = async () => {
    const built = buildEntryItems(rows, nameOf);
    if (!built.ok) return setMessage({ ok: false, text: built.error });
    setSaving(true);
    try {
      await stock.addEntries(built.value);
      setMessage({
        ok: true,
        text: `Compra lançada: ${describeCount(built.value.length)}.`,
      });
      setRows(new Map());
      setVersion((n) => n + 1);
      onSaved();
    } catch (failure) {
      setMessage({ ok: false, text: errorMessage(failure) });
    } finally {
      setSaving(false);
    }
  };
  const filled = [...rows.values()].filter(isRowTouched).length;
  return { rows, setRow, submit, message, saving, filled, version };
}

function EntryFooter(props: {
  message: Message;
  saving: boolean;
  filled: number;
}) {
  const { message, saving, filled } = props;
  return (
    <div className="count-footer">
      {message && (
        <p className={message.ok ? 'form-success' : 'form-error'} role="status">
          {message.text}
        </p>
      )}
      <button
        className="button"
        type="submit"
        disabled={saving}
        aria-busy={saving}
      >
        <Plus aria-hidden />
        {filled === 0 ? 'Lançar compra' : `Lançar compra (${filled})`}
      </button>
    </div>
  );
}

/**
 * Compra inteira de uma vez: uma linha por insumo, agrupada por seção. Cada linha vira um
 * lote com a sua validade; o valor pago atualiza o custo do insumo. Abaixo, o histórico
 * com "Desfazer" para o que entrou errado.
 */
export function EntryTab(props: EntryTabProps) {
  const grid = useEntryGrid(props);
  const view = useSectionFilter(props.supplies, props.sections);
  const history = useEntryHistory(props.stock, grid.version, props.onSaved);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void grid.submit();
  };
  return (
    <div className="entry-tab">
      <form onSubmit={handleSubmit}>
        <p className="hint">
          Digite só o que chegou; linhas em branco ficam de fora. Dois fardos
          com validades diferentes: lance um, depois o outro. Valor pago é
          opcional e vira o custo do insumo.
        </p>
        <SectionFilterBar
          sections={props.sections}
          filter={view.filter}
          counts={view.counts}
          onChange={view.setFilter}
        />
        <div className="card card-flush">
          <div className="table-scroll">
            <table className="table entry-table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Quantidade</th>
                  <th>Em</th>
                  <th>Validade</th>
                  <th>Valor pago</th>
                  <th className="num">Soma</th>
                </tr>
              </thead>
              <SectionedRows
                groups={view.groups}
                columnCount={6}
                renderRow={(supply) => (
                  <EntryGridRow
                    key={supply.id}
                    supply={supply}
                    row={grid.rows.get(supply.id) ?? BLANK_ENTRY_ROW}
                    onChange={(row) => grid.setRow(supply.id, row)}
                  />
                )}
              />
            </table>
          </div>
        </div>
        <EntryFooter
          message={grid.message}
          saving={grid.saving}
          filled={grid.filled}
        />
      </form>
      <EntryHistory history={history} />
    </div>
  );
}
