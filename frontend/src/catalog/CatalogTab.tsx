import { EyeOff, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EmptyState } from '../components/EmptyState';
import { SwitchField } from '../components/SwitchField';
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
  /** O botão que abre o painel do formulário ("Novo bairro"). */
  newLabel: string;
  renderForm(context: RowContext): ReactNode;
  renderRow(item: T, context: RowContext): ReactNode;
  /** Painel aberto por fora (ex.: o "Editar" de um insumo abre a ficha nele). */
  editing?: boolean;
  /** Ao fechar o painel ou pedir um novo (ex.: o insumo sai da edição). */
  onPanelClose?(): void;
  /** Ordem da tabela; padrão: alfabética pelo rótulo. */
  order?(items: T[]): T[];
  /**
   * Faixa de busca e filtros acima da tabela (ex.: seções dos insumos); recebe os itens
   * já filtrados por "Mostrar inativos", para os números dos botões baterem com a tabela.
   */
  toolbar?(shown: T[]): ReactNode;
  /** Filtro extra depois do de inativos (ex.: busca e seção). */
  narrow?(items: T[]): T[];
  /** Corpo da tabela sob medida (ex.: um `<tbody>` por seção); padrão: um só `<tbody>`. */
  renderBody?(visible: T[], context: RowContext): ReactNode;
  /** Classe da tabela, para o CSS de um cadastro só (ex.: colunas que somem com o painel). */
  tableClassName?: string;
}

interface CatalogActionsProps {
  showInactive: boolean;
  onShowInactive(checked: boolean): void;
  newLabel: string;
  onNew(): void;
}

/** "Mostrar inativos" à esquerda e o "Novo …" à direita, como no Cardápio. */
function CatalogActions(props: CatalogActionsProps) {
  return (
    <div className="catalog-actions">
      <SwitchField
        label="Mostrar inativos"
        Icon={EyeOff}
        checked={props.showInactive}
        onChange={props.onShowInactive}
      />
      <button type="button" className="button" onClick={props.onNew}>
        <Plus aria-hidden />
        {props.newLabel}
      </button>
    </div>
  );
}

/**
 * O formulário num painel ao lado da lista (2026-10-11: o formulário sempre aberto em cima
 * empurrava a lista para baixo). Abre com o foco no primeiro campo.
 */
function CatalogPanel(props: { onClose(): void; children: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    panelRef.current
      ?.querySelector<HTMLElement>('input:not([type="checkbox"]), select')
      ?.focus();
  }, []);
  return (
    <aside className="catalog-panel" ref={panelRef}>
      <button
        type="button"
        className="button-ghost button-sm catalog-panel-close"
        aria-label="Fechar o painel"
        onClick={props.onClose}
      >
        <X aria-hidden />
      </button>
      {props.children}
    </aside>
  );
}

interface CatalogTableProps {
  columns: ReactNode;
  body: ReactNode;
  className?: string;
}

function CatalogTable(props: CatalogTableProps) {
  return (
    <div className="card card-flush">
      <div className="table-scroll">
        <table className={`table ${props.className ?? ''}`}>
          <thead>
            <tr>{props.columns}</tr>
          </thead>
          {props.body}
        </table>
      </div>
    </div>
  );
}

function usePanel(editing: boolean, onPanelClose?: () => void) {
  const [creating, setCreating] = useState(false);
  return {
    open: creating || editing,
    openNew: () => {
      onPanelClose?.();
      setCreating(true);
    },
    close: () => {
      setCreating(false);
      onPanelClose?.();
    },
  };
}

/** Estrutura comum dos cadastros: ações, tabela, painel do formulário e estados. */
export function CatalogTab<T extends CatalogItem>(props: CatalogTabProps<T>) {
  const { noun, list, labelOf, renderRow } = props;
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = usePanel(Boolean(props.editing), props.onPanelClose);
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
  const narrow = props.narrow ?? ((items: T[]) => items);
  const order = props.order ?? ((items: T[]) => sortByLabel(items, labelOf));
  const shown = list.items.filter((item) => item.active || showInactive);
  const visible = order(narrow(shown));
  const body = props.renderBody?.(visible, context) ?? (
    <tbody>{visible.map((item) => renderRow(item, context))}</tbody>
  );
  return (
    <div className="catalog-tab">
      <p className="hint">{props.hint}</p>
      {props.toolbar?.(shown)}
      <CatalogActions
        showInactive={showInactive}
        onShowInactive={setShowInactive}
        newLabel={props.newLabel}
        onNew={panel.openNew}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="catalog-layout" data-panel={panel.open}>
        {visible.length === 0 ? (
          <EmptyState
            title={`Nenhum item em ${noun}`}
            hint={
              list.items.length === 0
                ? `Use o "${props.newLabel}" para cadastrar o primeiro.`
                : 'Todos estão inativos: marque "Mostrar inativos" para reativar.'
            }
          />
        ) : (
          <CatalogTable
            columns={props.columns}
            body={body}
            className={props.tableClassName}
          />
        )}
        {panel.open && (
          <CatalogPanel onClose={panel.close}>
            {props.renderForm(context)}
          </CatalogPanel>
        )}
      </div>
    </div>
  );
}
