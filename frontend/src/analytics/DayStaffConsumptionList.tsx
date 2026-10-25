import type { DayClosing } from '../api/day-closing-api';
import { formatMoney } from '../api/money';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { treeOfOrderItems } from '../cash/item-tree';
import { ItemTree } from '../cash/ItemTree';
import { formatOrderTime } from '../cash/order-time';
import { costOf } from '../staff-consumption/consumption-cost';

/** O custo do lançamento (a rota é do admin, então ele vem); sem custo, nada. */
function ConsumptionCostFigure({
  consumption,
}: {
  consumption: StaffConsumption;
}) {
  const cost = costOf(consumption);
  return cost && <strong>{formatMoney(cost.cmvTotal)}</strong>;
}

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
          <ConsumptionCostFigure consumption={consumption} />
        </li>
      ))}
    </ul>
  );
}
