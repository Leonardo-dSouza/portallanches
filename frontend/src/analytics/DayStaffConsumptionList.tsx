import type { DayClosing } from '../api/day-closing-api';
import { formatMoney } from '../api/money';
import { treeOfOrderItems } from '../cash/item-tree';
import { ItemTree } from '../cash/ItemTree';
import { formatOrderTime } from '../cash/order-time';

/** Consumo interno do dia (2026-10-23), só para ler: hora, quem, os itens e o custo. */
export function DayStaffConsumptionList({ day }: { day: DayClosing }) {
  if (day.staffConsumptions.length === 0)
    return <p className="analytics-empty">Nenhum consumo interno nesse dia.</p>;
  return (
    <ul className="day-staff">
      {day.staffConsumptions.map((consumption) => (
        <li key={consumption.id}>
          <span className="day-expense-type">
            {consumption.consumerName}
            <small>{formatOrderTime(consumption.createdAt)}</small>
          </span>
          <ItemTree rows={treeOfOrderItems(consumption.items)} />
          <strong>{formatMoney(consumption.cmvTotal)}</strong>
        </li>
      ))}
    </ul>
  );
}
