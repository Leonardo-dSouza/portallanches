import type { Supply } from '../api/types';
import { SearchField } from '../components/SearchField';
import type { SupplyCandidate } from './supply-suggestion';

interface SupplyPickListProps {
  candidates: SupplyCandidate<Supply>[];
  selectedId: number | null;
  query: string;
  onQuery(query: string): void;
  onSelect(supplyId: number): void;
}

/**
 * Busca e lista numa coisa só (2026-11-14: antes era a busca e depois um select): digita, a
 * lista filtra, clica no insumo. Os sugeridos pelo nome do item vêm em cima.
 *
 * @example <SupplyPickList candidates={list} selectedId={10} query="" onQuery={setQ} onSelect={pick} />
 */
export function SupplyPickList({
  candidates,
  selectedId,
  query,
  onQuery,
  onSelect,
}: SupplyPickListProps) {
  return (
    <div className="supply-pick">
      <SearchField
        label="Buscar insumo"
        placeholder="Nome do insumo"
        value={query}
        autoFocus
        onChange={onQuery}
      />
      <fieldset className="supply-pick-list" aria-label="Insumo">
        {candidates.length === 0 ? (
          <p className="hint">{`Nenhum insumo com "${query}".`}</p>
        ) : (
          candidates.map((candidate) => (
            <SupplyOption
              key={candidate.supply.id}
              candidate={candidate}
              checked={candidate.supply.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </fieldset>
    </div>
  );
}

function SupplyOption({
  candidate: { supply, suggested },
  checked,
  onSelect,
}: {
  candidate: SupplyCandidate<Supply>;
  checked: boolean;
  onSelect(supplyId: number): void;
}) {
  return (
    <label>
      <input
        type="radio"
        name="link-supply"
        checked={checked}
        onChange={() => onSelect(supply.id)}
      />
      <span className="supply-pick-name">{supply.name}</span>
      {suggested && <span className="tag">sugerido</span>}
      <small>{supply.countUnit}</small>
    </label>
  );
}
