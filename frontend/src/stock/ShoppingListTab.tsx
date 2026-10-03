import { Copy, Download } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatQuantity } from '../api/quantity';
import type { StockItem, SupplySection } from '../api/types';
import { buildShoppingList } from './shopping-list';
import type { SelectionStorage } from './selection-storage';
import { isCritical } from './stock-view';
import { groupBySection } from './supply-sections';
import type { TextExport } from './text-export';

interface ShoppingListTabProps {
  items: StockItem[];
  sections: SupplySection[];
  today: string;
  storage: SelectionStorage;
  textExport: TextExport;
}

/** Seleção lembrada; na primeira vez (ou sem armazenamento), só os que precisam de atenção. */
function initialSelection(
  items: StockItem[],
  storage: SelectionStorage,
): Set<number> {
  const saved = storage.load();
  const ids = saved ?? items.filter(isCritical).map((item) => item.supplyId);
  return new Set(
    ids.filter((id) => items.some((item) => item.supplyId === id)),
  );
}

function useSelection(items: StockItem[], storage: SelectionStorage) {
  const [selected, setSelected] = useState(() =>
    initialSelection(items, storage),
  );
  const replace = (ids: number[]) => {
    setSelected(new Set(ids));
    storage.save(ids);
  };
  const toggle = (id: number) =>
    replace(
      selected.has(id)
        ? [...selected].filter((other) => other !== id)
        : [...selected, id],
    );
  const pick = (filter: (item: StockItem) => boolean) =>
    replace(items.filter(filter).map((item) => item.supplyId));
  return { selected, toggle, pick };
}

interface SupplyChecklistProps {
  items: StockItem[];
  selection: ReturnType<typeof useSelection>;
}

/** Checklist agrupado na ordem da prateleira, para marcar seção por seção. */
function SectionedChecklist(
  props: SupplyChecklistProps & { sections: SupplySection[] },
) {
  const { items, sections, selection } = props;
  return groupBySection(items, sections).map(({ section, items: group }) => (
    <div key={section?.id ?? 'sem-secao'} className="shopping-section">
      <h3>{section?.name ?? 'Sem seção'}</h3>
      <SupplyChecklist items={group} selection={selection} />
    </div>
  ));
}

function SupplyChecklist({ items, selection }: SupplyChecklistProps) {
  return (
    <ul className="shopping-checklist">
      {items.map((item) => (
        <li key={item.supplyId} data-critical={isCritical(item)}>
          <label>
            <input
              type="checkbox"
              checked={selection.selected.has(item.supplyId)}
              onChange={() => selection.toggle(item.supplyId)}
            />
            <span className="shopping-name">{item.name}</span>
            <span className="shopping-qty">
              {formatQuantity(item.quantity)} {item.countUnit}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lista de compras em texto: o caixa escolhe os insumos (a escolha fica lembrada neste
 * navegador) e copia para o WhatsApp ou baixa um .txt.
 */
export function ShoppingListTab({
  items,
  sections,
  today,
  storage,
  textExport,
}: ShoppingListTabProps) {
  const selection = useSelection(items, storage);
  const [message, setMessage] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const text = buildShoppingList(items, selection.selected, today);
  const copy = async () => {
    const copied = await textExport.copy(text, textRef.current);
    setMessage(
      copied
        ? 'Lista copiada.'
        : 'Não deu para copiar: selecione o texto e use Ctrl+C.',
    );
  };
  return (
    <div className="shopping-grid">
      <section className="card">
        <h2>Insumos na lista</h2>
        <div className="shopping-quick">
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => selection.pick(() => true)}
          >
            Todos
          </button>
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => selection.pick(isCritical)}
          >
            Só os que precisam de atenção
          </button>
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => selection.pick(() => false)}
          >
            Nenhum
          </button>
        </div>
        <SectionedChecklist
          items={items}
          sections={sections}
          selection={selection}
        />
      </section>
      <section className="card shopping-output">
        <h2>Texto</h2>
        <textarea
          ref={textRef}
          readOnly
          aria-label="Texto da lista de compras"
          value={text || 'Marque ao menos um insumo para montar a lista.'}
        />
        {message && (
          <p className="hint" role="status">
            {message}
          </p>
        )}
        <div className="shopping-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={!text}
            onClick={() =>
              textExport.download(`lista-de-compras-${today}.txt`, text)
            }
          >
            <Download aria-hidden />
            Baixar .txt
          </button>
          <button
            type="button"
            className="button"
            disabled={!text}
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            Copiar lista
          </button>
        </div>
      </section>
    </div>
  );
}
