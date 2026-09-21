import { useState, type ReactNode } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { LoadFailure } from './LoadFailure';
import { sortByLabel } from './catalog-values';
import type { RowContext } from './use-row-action';
import type { CatalogList } from './use-catalog-list';

interface CatalogItem {
  id: number;
  active: boolean;
}

interface CatalogTabProps<T extends CatalogItem> {
  /** Plural para os textos de vazio ("bairros"). */
  noun: string;
  hint: string;
  list: CatalogList<T>;
  labelOf(item: T): string;
  columns: ReactNode;
  renderForm(context: RowContext): ReactNode;
  renderRow(item: T, context: RowContext): ReactNode;
}

function ShowInactiveToggle(props: {
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="catalog-toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      Mostrar inativos
    </label>
  );
}

/** Estrutura comum dos cadastros: formulário de novo, filtro de inativos, tabela e estados. */
export function CatalogTab<T extends CatalogItem>(props: CatalogTabProps<T>) {
  const { noun, hint, list, labelOf, columns, renderForm, renderRow } = props;
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (list.error)
    return <LoadFailure message={list.error} onRetry={list.reload} />;
  if (!list.items) return <Skeleton label={`Carregando ${noun}…`} rows={4} />;
  const context: RowContext = {
    onSaved: () => {
      setError(null);
      list.reload();
    },
    onError: setError,
  };
  const visible = sortByLabel(
    list.items.filter((item) => item.active || showInactive),
    labelOf,
  );
  return (
    <div className="catalog-tab">
      {renderForm(context)}
      <p className="hint">{hint}</p>
      <ShowInactiveToggle checked={showInactive} onChange={setShowInactive} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <EmptyState
          title={`Nenhum item em ${noun}`}
          hint={
            list.items.length === 0
              ? 'Use o formulário acima para cadastrar o primeiro.'
              : 'Todos estão inativos: marque "Mostrar inativos" para reativar.'
          }
        />
      ) : (
        <div className="card card-flush">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>{columns}</tr>
              </thead>
              <tbody>{visible.map((item) => renderRow(item, context))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
