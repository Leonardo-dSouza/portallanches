import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useApi } from '../api/api-context';
import type { CostSheetView, CostSupply } from '../api/cost-types';
import { typedMoney } from '../api/money';
import { createPurchaseApi } from '../api/purchase-api';
import type { SupplyLastPricesMap } from '../api/purchase-types';
import { createSupplyApi } from '../api/supply-api';
import type { SupplySection } from '../api/types';
import { SearchField } from '../components/SearchField';
import {
  currentChoice,
  groupSuppliesBySection,
  isSupplyChanged,
  toBasePriceChange,
  type BasePriceChoice,
  type SupplyGroup,
} from './base-price-values';
import { CostHistoryDialog } from './CostHistoryDialog';
import { SectionRows } from './SupplyCostRow';
import type { CostDraft } from './use-cost-draft';

/** Propriedades da aba de Insumos da tela de custos. */
export interface SuppliesCostTabProps {
  view: CostSheetView;
  draft: CostDraft;
}

function SuppliesToolbar(props: {
  query: string;
  onlyChanged: boolean;
  onQueryChange(value: string): void;
  onToggleOnlyChanged(): void;
}) {
  const { query, onlyChanged, onQueryChange, onToggleOnlyChanged } = props;
  const chipClass = `toggle-key toggle-key-sm ${onlyChanged ? 'toggle-key-brand' : ''}`;
  return (
    <div className="supplies-cost-toolbar">
      <SearchField
        label="Buscar insumo"
        placeholder="Nome do insumo"
        value={query}
        onChange={onQueryChange}
      />
      <button
        type="button"
        className={chipClass}
        aria-pressed={onlyChanged}
        onClick={onToggleOnlyChanged}
      >
        Só os mudados
      </button>
    </div>
  );
}

function filterSupplies(
  supplies: CostSupply[],
  onlyChanged: boolean,
  query: string,
  draft: CostDraft,
  view: CostSheetView,
): CostSupply[] {
  let list = supplies;
  if (onlyChanged) {
    list = list.filter((s) => isSupplyChanged(s.id, draft, view));
  }
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') return list;
  return list.filter((s) => s.name.toLowerCase().includes(trimmed));
}

function applyPriceChange(
  supply: CostSupply,
  typed: string,
  choice: BasePriceChoice,
  draft: CostDraft,
  setErrors: Dispatch<SetStateAction<Record<number, string>>>,
) {
  const result = toBasePriceChange(supply.id, typed, choice);
  if (result.ok) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[supply.id];
      return next;
    });
    draft.setBasePrice(result.change);
  } else {
    setErrors((prev) => ({ ...prev, [supply.id]: result.problem }));
  }
}

function useSupplySections(api: ReturnType<typeof useApi>) {
  const [sections, setSections] = useState<SupplySection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const supplyApi = useMemo(() => createSupplyApi(api), [api]);
  useEffect(() => {
    let active = true;
    supplyApi
      .listSections()
      .then((data) => active && (setSections(data), setLoaded(true)))
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [supplyApi]);
  return { sections, loaded };
}

function useSupplyLastPrices(api: ReturnType<typeof useApi>) {
  const [lastPrices, setLastPrices] = useState<SupplyLastPricesMap>({});
  const purchaseApi = useMemo(() => createPurchaseApi(api), [api]);
  useEffect(() => {
    let active = true;
    purchaseApi
      .lastPrices()
      .then((data) => {
        if (active) setLastPrices(data);
      })
      .catch(() => {
        if (active) setLastPrices({});
      });
    return () => {
      active = false;
    };
  }, [purchaseApi]);
  return lastPrices;
}

function resolveTypedBasePrice(
  localValue: string | undefined,
  draftPrice: string | null | undefined,
  savedPrice: string | null,
): string {
  if (localValue !== undefined) return localValue;
  if (draftPrice) return typedMoney(draftPrice);
  if (savedPrice) return typedMoney(savedPrice);
  return '';
}

function handlePriceInput(
  supply: CostSupply,
  typed: string,
  choices: Record<number, BasePriceChoice>,
  draft: CostDraft,
  setLocalValues: Dispatch<SetStateAction<Record<number, string>>>,
  setErrors: Dispatch<SetStateAction<Record<number, string>>>,
) {
  setLocalValues((prev) => ({ ...prev, [supply.id]: typed }));
  const choice = choices[supply.id] ?? currentChoice(supply);
  applyPriceChange(supply, typed, choice, draft, setErrors);
}

function handlePackageSelect(
  supply: CostSupply,
  choice: BasePriceChoice,
  draft: CostDraft,
  localValue: string | undefined,
  setChoices: Dispatch<SetStateAction<Record<number, BasePriceChoice>>>,
  setErrors: Dispatch<SetStateAction<Record<number, string>>>,
) {
  setChoices((prev) => ({ ...prev, [supply.id]: choice }));
  const draftChange = draft.changes.basePrices.find(
    (b) => b.supplyId === supply.id,
  );
  const typed = resolveTypedBasePrice(
    localValue,
    draftChange?.basePrice,
    supply.basePrice,
  );
  applyPriceChange(supply, typed, choice, draft, setErrors);
}

interface SuppliesTableProps {
  groups: SupplyGroup[];
  view: CostSheetView;
  draft: CostDraft;
  localValues: Record<number, string>;
  errors: Record<number, string>;
  selectedChoices: Record<number, BasePriceChoice>;
  lastPrices: SupplyLastPricesMap;
  onSelectSupply(supply: CostSupply): void;
  onPriceChange(supply: CostSupply, typed: string): void;
  onPackageChange(supply: CostSupply, choice: BasePriceChoice): void;
}

function SuppliesTableHeader() {
  return (
    <thead>
      <tr>
        <th>Insumo</th>
        <th>Compra em</th>
        <th className="num">Preço base</th>
        <th className="num">Custo por unidade</th>
        <th>Última nota</th>
        <th className="num">Usado em</th>
      </tr>
    </thead>
  );
}

function SuppliesTable(props: SuppliesTableProps) {
  return (
    <div className="card card-flush">
      <div className="table-scroll">
        <table className="table">
          <SuppliesTableHeader />
          <tbody>
            {props.groups.map((group) => (
              <SectionRows
                key={group.id ?? 'unassigned'}
                {...props}
                lastPrices={props.lastPrices}
                group={group}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useSuppliesTabState() {
  const [filter, setFilter] = useState({ query: '', onlyChanged: false });
  const [historySupply, setHistorySupply] = useState<CostSupply | null>(null);
  const [localValues, setLocalValues] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [choices, setChoices] = useState<Record<number, BasePriceChoice>>({});
  return {
    filter,
    setFilter,
    historySupply,
    setHistorySupply,
    localValues,
    setLocalValues,
    errors,
    setErrors,
    choices,
    setChoices,
  };
}

/**
 * Aba de Insumos da planilha de custos com edição de preço base, embalagens e histórico.
 *
 * @example <SuppliesCostTab view={view} draft={draft} />
 */
export function SuppliesCostTab({ view, draft }: SuppliesCostTabProps) {
  const api = useApi();
  const { sections, loaded } = useSupplySections(api);
  const lastPrices = useSupplyLastPrices(api);
  const s = useSuppliesTabState();
  const onPrice = (sp: CostSupply, t: string) =>
    handlePriceInput(sp, t, s.choices, draft, s.setLocalValues, s.setErrors);
  const onPack = (sp: CostSupply, c: BasePriceChoice) =>
    handlePackageSelect(
      sp,
      c,
      draft,
      s.localValues[sp.id],
      s.setChoices,
      s.setErrors,
    );
  const supplies = useMemo(
    () =>
      filterSupplies(
        view.snapshot.supplies,
        s.filter.onlyChanged,
        s.filter.query,
        draft,
        view,
      ),
    [view, s.filter, draft],
  );
  const groups = useMemo(
    () => groupSuppliesBySection(supplies, sections),
    [supplies, sections],
  );
  if (!loaded)
    return (
      <div className="skeleton">
        <div className="skeleton-line" />
      </div>
    );
  return (
    <div className="supplies-cost-tab">
      <SuppliesToolbar
        query={s.filter.query}
        onlyChanged={s.filter.onlyChanged}
        onQueryChange={(q) => s.setFilter((p) => ({ ...p, query: q }))}
        onToggleOnlyChanged={() =>
          s.setFilter((p) => ({ ...p, onlyChanged: !p.onlyChanged }))
        }
      />
      <SuppliesTable
        groups={groups}
        view={view}
        draft={draft}
        localValues={s.localValues}
        errors={s.errors}
        selectedChoices={s.choices}
        lastPrices={lastPrices}
        onSelectSupply={s.setHistorySupply}
        onPriceChange={onPrice}
        onPackageChange={onPack}
      />
      {s.historySupply && (
        <CostHistoryDialog
          supply={s.historySupply}
          onClose={() => s.setHistorySupply(null)}
        />
      )}
    </div>
  );
}
