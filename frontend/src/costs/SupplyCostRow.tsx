import { useMemo } from 'react';
import type { CostSheetView, CostSupply } from '../api/cost-types';
import { formatAmount, typedMoney } from '../api/money';
import type {
  SupplyLastPrice,
  SupplyLastPricesMap,
} from '../api/purchase-types';
import {
  formatDayMonth,
  formatBaseDiff,
  baseDiffTone,
  BASE_DIFF_TAG_CLASS,
} from '../purchases/invoice-format';
import {
  countSupplyUsage,
  currentChoice,
  formatChoiceLabel,
  formatUnitPrice,
  formatUsedIn,
  isProducedSupply,
  packageChoices,
  type BasePriceChoice,
  type SupplyGroup,
  unitCostFormula,
} from './base-price-values';
import type { CostDraft } from './use-cost-draft';

interface InsumoNameProps {
  name: string;
  isProduced: boolean;
  usedIn: string;
  onClick(): void;
}

function InsumoNameCell({
  name,
  isProduced,
  usedIn,
  onClick,
}: InsumoNameProps) {
  return (
    <td className="supply-name-cell">
      <button type="button" className="supply-name" onClick={onClick}>
        {name}
      </button>
      <span className="supply-used-in">
        {isProduced ? `ficha de produção · ${usedIn}` : usedIn}
      </span>
    </td>
  );
}

interface PackageSelectProps {
  supply: CostSupply;
  activeChoice: BasePriceChoice;
  choices: BasePriceChoice[];
  onChange(choice: BasePriceChoice): void;
}

function onSelectOption(
  e: React.ChangeEvent<HTMLSelectElement>,
  choices: BasePriceChoice[],
  onChange: (c: BasePriceChoice) => void,
) {
  const found = choices.find((c) => (c.label ?? '__unit__') === e.target.value);
  onChange(found ?? choices[0]);
}

function PackageSelect(props: PackageSelectProps) {
  const { supply, activeChoice, choices, onChange } = props;
  return (
    <select
      className="cell-select rounded-control border border-line bg-surface px-2 py-1 text-sm text-ink"
      aria-label={`Embalagem de compra do ${supply.name.toLowerCase()}`}
      value={activeChoice.label ?? '__unit__'}
      onChange={(e) => onSelectOption(e, choices, onChange)}
    >
      {choices.map((c) => (
        <option key={c.label ?? '__unit__'} value={c.label ?? '__unit__'}>
          {formatChoiceLabel(c, supply.countUnit)}
        </option>
      ))}
    </select>
  );
}

interface PriceCellProps {
  supply: CostSupply;
  isProduced: boolean;
  originalPrice: string | null;
  draftPrice: string | null | undefined;
  localValue: string | undefined;
  error: string | undefined;
  onChange(typed: string): void;
}

function resolveDisplayPrice(
  hasChange: boolean,
  draftPrice: string | null | undefined,
  savedPrice: string | null,
  localValue: string | undefined,
): string {
  if (localValue !== undefined) return localValue;
  if (hasChange) return draftPrice ? typedMoney(draftPrice) : '';
  return savedPrice ? typedMoney(savedPrice) : '';
}

function OldPriceStrikethrough({ oldPrice }: { oldPrice: string | null }) {
  if (!oldPrice) return null;
  return <s className="cell-was text-xs text-muted line-through">{oldPrice}</s>;
}

interface PriceInputWrapperProps {
  name: string;
  hasChange: boolean;
  hasError: boolean;
  display: string;
  oldPrice: string | null;
  onChange(value: string): void;
}

function PriceInputWrapper(props: PriceInputWrapperProps) {
  const { name, hasChange, hasError, display, oldPrice, onChange } = props;
  const inputClass = `cell-input cell-input-short ${hasChange ? 'cell-edited' : ''}`;
  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        className={inputClass}
        aria-label={`Preço base do ${name.toLowerCase()}`}
        aria-invalid={hasError}
        value={display}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasChange && <OldPriceStrikethrough oldPrice={oldPrice} />}
    </div>
  );
}

function PriceBase(props: PriceCellProps) {
  const {
    supply,
    isProduced,
    originalPrice,
    draftPrice,
    localValue,
    error,
    onChange,
  } = props;
  if (isProduced) return null;
  const hasChange = draftPrice !== undefined;
  const display = resolveDisplayPrice(
    hasChange,
    draftPrice,
    supply.basePrice,
    localValue,
  );
  const oldPrice = originalPrice ? typedMoney(originalPrice) : null;
  return (
    <span className="supply-price">
      <PriceInputWrapper
        name={supply.name}
        hasChange={hasChange}
        hasError={Boolean(error)}
        display={display}
        oldPrice={oldPrice}
        onChange={onChange}
      />
      {error && <span className="cell-error">{error}</span>}
    </span>
  );
}

function UnitCostCell({
  supply,
  incomplete,
}: {
  supply: CostSupply;
  incomplete: boolean;
}) {
  if (!supply.unitCost)
    return (
      <td>
        <span className="text-muted">sem custo</span>
      </td>
    );
  const formula = unitCostFormula(supply.basePrice, supply.baseQuantity);
  return (
    <td className="supply-unit-cost">
      <span aria-hidden="true">=</span>{' '}
      <strong>{formatUnitPrice(supply.unitCost)}</strong>{' '}
      <span>por {supply.countUnit}</span>
      {formula && <span className="supply-formula">({formula})</span>}
      {incomplete && <span className="tag tag-danger">incompleto</span>}
    </td>
  );
}

function LastPriceCell({ lastPrice }: { lastPrice?: SupplyLastPrice }) {
  if (!lastPrice) {
    return (
      <td>
        <span className="text-muted">—</span>
      </td>
    );
  }
  const diffClass = BASE_DIFF_TAG_CLASS[baseDiffTone(lastPrice)];
  const formattedPaid = formatAmount(lastPrice.paidPerUnit);
  const formattedDate = formatDayMonth(lastPrice.issuedAt);
  const formattedDiff = formatBaseDiff(lastPrice.diffPercent);

  return (
    <td className="whitespace-nowrap">
      <span>{`${formattedPaid} · ${lastPrice.vendorName} · ${formattedDate}`}</span>
      <span className={diffClass}>{formattedDiff}</span>
    </td>
  );
}

/** "usado em 12 lanches · 1 ficha"; sem uso, diz que não entra em nada. */
function usedInText(lanches: number, fichas: number): string {
  const used = formatUsedIn(lanches, fichas);
  return used === '—' ? 'não entra em lanche' : `usado em ${used}`;
}

function activeChoiceOf(
  selected: BasePriceChoice | undefined,
  draftChange: { baseLabel: string | null; baseQuantity: string } | undefined,
  supply: CostSupply,
): BasePriceChoice {
  if (selected) return selected;
  if (draftChange) {
    return {
      label: draftChange.baseLabel,
      quantity: draftChange.baseQuantity,
    };
  }
  return currentChoice(supply);
}

/** Propriedades de uma linha de insumo na tabela de custos. */
export interface SupplyCostRowProps {
  supply: CostSupply;
  view: CostSheetView;
  draft: CostDraft;
  localValue: string | undefined;
  error: string | undefined;
  selectedChoice: BasePriceChoice | undefined;
  lastPrice?: SupplyLastPrice;
  onSelectSupply(supply: CostSupply): void;
  onPriceChange(supply: CostSupply, typed: string): void;
  onPackageChange(supply: CostSupply, choice: BasePriceChoice): void;
}

/**
 * Linha da tabela de insumos com nome, seleção de embalagem, preço base e custo unitário.
 *
 * @example <SupplyCostRow supply={supply} view={view} draft={draft} {...props} />
 */
export function SupplyCostRow(props: SupplyCostRowProps) {
  const { supply, view, draft, onSelectSupply } = props;
  const isProduced = isProducedSupply(supply.id, view, draft);
  const choices = useMemo(() => packageChoices(supply), [supply]);
  const draftChange = draft.changes.basePrices.find(
    (b) => b.supplyId === supply.id,
  );
  const activeChoice = activeChoiceOf(
    props.selectedChoice,
    draftChange,
    supply,
  );
  const orig = draft.sheet?.snapshot.supplies.find((s) => s.id === supply.id);
  const { lanches, fichas } = countSupplyUsage(supply.id, view);
  return (
    <tr>
      <InsumoNameCell
        name={supply.name}
        isProduced={isProduced}
        usedIn={usedInText(lanches, fichas)}
        onClick={() => onSelectSupply(supply)}
      />
      <td className="supply-purchase">
        {isProduced ? (
          <span className="text-muted">o custo vem da ficha em Produção</span>
        ) : (
          <>
            <PackageSelect
              supply={supply}
              activeChoice={activeChoice}
              choices={choices}
              onChange={(c) => props.onPackageChange(supply, c)}
            />
            <span className="supply-por">por R$</span>
            <PriceBase
              supply={supply}
              isProduced={isProduced}
              originalPrice={orig?.basePrice ?? null}
              draftPrice={draftChange?.basePrice}
              localValue={props.localValue}
              error={props.error}
              onChange={(t) => props.onPriceChange(supply, t)}
            />
          </>
        )}
      </td>
      <UnitCostCell
        supply={supply}
        incomplete={view.incompleteSupplyIds.includes(supply.id)}
      />
      <LastPriceCell lastPrice={props.lastPrice} />
      <td className="text-right">
        <button
          type="button"
          className="button-ghost button-sm"
          onClick={() => onSelectSupply(supply)}
        >
          Histórico
        </button>
      </td>
    </tr>
  );
}

/** Propriedades das linhas de uma seção do estoque. */
export interface SectionRowsProps {
  group: SupplyGroup;
  view: CostSheetView;
  draft: CostDraft;
  localValues: Record<number, string>;
  errors: Record<number, string>;
  selectedChoices: Record<number, BasePriceChoice>;
  lastPrices?: SupplyLastPricesMap;
  onSelectSupply(supply: CostSupply): void;
  onPriceChange(supply: CostSupply, typed: string): void;
  onPackageChange(supply: CostSupply, choice: BasePriceChoice): void;
}

/**
 * Linhas de uma seção do estoque, com cabeçalho de grupo e suas linhas de insumo.
 *
 * @example <SectionRows group={group} view={view} draft={draft} {...props} />
 */
export function SectionRows(props: SectionRowsProps) {
  return (
    <>
      <tr className="section-group bg-sunken/60 font-semibold">
        <td colSpan={5}>{props.group.name}</td>
      </tr>
      {props.group.supplies.map((supply) => (
        <SupplyCostRow
          key={supply.id}
          supply={supply}
          view={props.view}
          draft={props.draft}
          localValue={props.localValues[supply.id]}
          error={props.errors[supply.id]}
          selectedChoice={props.selectedChoices[supply.id]}
          lastPrice={props.lastPrices?.[supply.id]}
          onSelectSupply={props.onSelectSupply}
          onPriceChange={props.onPriceChange}
          onPackageChange={props.onPackageChange}
        />
      ))}
    </>
  );
}
