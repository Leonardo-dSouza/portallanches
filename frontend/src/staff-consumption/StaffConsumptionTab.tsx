import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { ClosedNotice } from '../cash/ClosedNotice';
import type { CashDay } from '../cash/use-cash-day';
import { StaffConsumptionForm } from './StaffConsumptionForm';
import { StaffConsumptionList } from './StaffConsumptionList';

interface TabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

/** Aba Consumo do caixa (2026-10-23): o lançamento ao lado e a lista do dia, como a aba Gastos. */
export function StaffConsumptionTab({ cash, day, onChanged }: TabProps) {
  const [editing, setEditing] = useState<StaffConsumption | null>(null);
  const locked = day.closing.status === 'CLOSED';
  const saved = () => {
    setEditing(null);
    onChanged();
  };
  return (
    <div className="cash-grid">
      {locked ? (
        <ClosedNotice
          what="consumos"
          closing={day.closing}
          onReopened={onChanged}
        />
      ) : (
        <StaffConsumptionForm
          key={editing?.id ?? 'novo'}
          cash={cash}
          day={day}
          editing={editing}
          onSaved={saved}
          onCancelEdit={() => setEditing(null)}
        />
      )}
      <StaffConsumptionList
        cash={cash}
        consumptions={day.staffConsumptions}
        locked={locked}
        onEdit={setEditing}
        onChanged={onChanged}
      />
    </div>
  );
}
