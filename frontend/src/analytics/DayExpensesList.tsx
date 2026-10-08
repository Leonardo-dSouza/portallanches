import type { DayClosing } from '../api/day-closing-api';
import { formatMoney } from '../api/money';

/** Gastos lançados no dia (tipo, observação e valor), só para ler. */
export function DayExpensesList({ day }: { day: DayClosing }) {
  if (day.expenses.length === 0)
    return <p className="analytics-empty">Nenhum gasto nesse dia.</p>;
  const typeName = (id: number) =>
    day.expenseTypes.find((type) => type.id === id)?.name ?? `Tipo ${id}`;
  return (
    <ul className="day-expenses">
      {day.expenses.map((expense) => (
        <li key={expense.id}>
          <span className="day-expense-type">
            {typeName(expense.expenseTypeId)}
            {expense.description && <small>{expense.description}</small>}
          </span>
          <strong>{formatMoney(expense.amount)}</strong>
        </li>
      ))}
    </ul>
  );
}
