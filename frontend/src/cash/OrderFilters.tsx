import type { Order } from '../api/types';
import { filterCounts, ORDER_FILTERS, type OrderFilter } from './order-filters';

interface OrderFiltersProps {
  orders: Order[];
  /** Fiados de outras noites a cobrar nesta: somam no A pagar. */
  dueCount: number;
  active: OrderFilter;
  onChange(filter: OrderFilter): void;
}

/** Teclas de filtro com a contagem de cada um, em cima da lista de pedidos. */
export function OrderFilters({
  orders,
  dueCount,
  active,
  onChange,
}: OrderFiltersProps) {
  const counts = filterCounts(orders, dueCount);
  return (
    <div className="order-filters" role="group" aria-label="Filtrar pedidos">
      {ORDER_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className="toggle-key toggle-key-sm"
          aria-pressed={filter.id === active}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
          <span className="toggle-key-count">{counts[filter.id]}</span>
        </button>
      ))}
    </div>
  );
}
