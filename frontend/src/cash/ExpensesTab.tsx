import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Expense } from '../api/types';
import { ClosedNotice } from './ClosedNotice';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';
import type { CashDay } from './use-cash-day';

interface TabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

export function ExpensesTab({ cash, day, onChanged }: TabProps) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const locked = day.closing.status === 'CLOSED';
  const saved = () => {
    setEditing(null);
    onChanged();
  };
  return (
    <div className="cash-grid">
      {locked ? (
        <ClosedNotice
          what="gastos"
          closing={day.closing}
          onReopened={onChanged}
        />
      ) : (
        <ExpenseForm
          key={editing?.id ?? 'novo'}
          cash={cash}
          day={day}
          editing={editing}
          onSaved={saved}
          onCancelEdit={() => setEditing(null)}
        />
      )}
      <ExpenseList
        cash={cash}
        day={day}
        locked={locked}
        onEdit={setEditing}
        onChanged={onChanged}
      />
    </div>
  );
}
