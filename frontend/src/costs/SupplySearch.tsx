import { useMemo, useState } from 'react';
import type { CostSupply } from '../api/cost-types';

export interface SupplySearchProps {
  available: CostSupply[];
  onSelect(supplyId: number): void;
  onCancel(): void;
}

/**
 * Busca de insumo para acrescentar numa receita ou ficha.
 *
 * @example <SupplySearch available={supplies} onSelect={add} onCancel={close} />
 */
export function SupplySearch({
  available,
  onSelect,
  onCancel,
}: SupplySearchProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((s) => s.name.toLowerCase().includes(q));
  }, [available, query]);

  return (
    <div className="flex flex-col gap-2 p-2 border border-line rounded-control bg-surface">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="cell flex-1 text-left"
          placeholder="Buscar insumo..."
          aria-label="Buscar insumo"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="button-ghost button-sm"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
      <ul
        aria-label="Insumos disponíveis"
        className="max-h-48 overflow-y-auto divide-y divide-line text-sm"
      >
        {filtered.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="w-full text-left p-1.5 hover:bg-sunken rounded"
              onClick={() => onSelect(s.id)}
            >
              {s.name}{' '}
              <span className="text-muted text-xs">({s.countUnit})</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="p-2 text-muted text-xs">Nenhum insumo encontrado</li>
        )}
      </ul>
    </div>
  );
}
