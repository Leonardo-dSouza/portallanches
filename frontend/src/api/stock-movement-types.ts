/** Movimentações do estoque de um insumo (2026-11-08, card 5): GET /stock/supplies/:id/movements. */
export type StockMovementKind =
  'ENTRY' | 'COUNT' | 'REVERSAL' | 'SALE' | 'SALE_RETURN';

export interface StockMovementTotals {
  entered: string;
  sold: string;
  adjusted: string;
}

export interface SupplyMovementItem {
  id: number;
  kind: StockMovementKind;
  kindLabel: string;
  quantity: string;
  balanceAfter: string;
  origin: string | null;
  createdByName: string;
  createdAt: string;
}

export interface SupplyMovementsReport {
  supply: {
    id: number;
    name: string;
    countUnit: string;
  };
  totals: StockMovementTotals;
  movements: SupplyMovementItem[];
}
