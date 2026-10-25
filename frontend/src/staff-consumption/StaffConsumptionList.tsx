import { Pencil, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type {
  ConsumptionCost,
  StaffConsumption,
} from '../api/staff-consumption-types';
import { treeOfOrderItems } from '../cash/item-tree';
import { ItemTree } from '../cash/ItemTree';
import { formatOrderTime } from '../cash/order-time';
import { useConfirmTwice } from '../cash/use-confirm-twice';
import { EmptyState } from '../components/EmptyState';
import { printSafely } from '../print/print-decision';
import { usePrinter } from '../print/printer-context';
import { staffConsumptionReceipt } from '../print/receipt-model';
import { useTicketSettings } from '../print/ticket-settings';
import { costOf } from './consumption-cost';

interface StaffConsumptionListProps {
  cash: CashApi;
  consumptions: StaffConsumption[];
  /** Dia fechado: só a consulta e o Reimprimir. */
  locked: boolean;
  onEdit(consumption: StaffConsumption): void;
  onChanged(): void;
}

/** O custo da casa (CMV da época) e, embaixo, quantos itens ficaram sem custo (açaí). */
function ConsumptionCostCell({ cost }: { cost: ConsumptionCost | null }) {
  if (!cost) return <td />;
  const { cmvTotal, missingCostCount } = cost;
  return (
    <td className="num">
      <span className="strong">{formatMoney(cmvTotal)}</span>
      {missingCostCount > 0 && (
        <span
          className="cost-missing"
          title="Item sem composição no Cardápio (ex.: açaí): entra sem custo"
        >
          {missingCostCount} sem custo
        </span>
      )}
    </td>
  );
}

interface RowActionsProps {
  consumption: StaffConsumption;
  locked: boolean;
  onEdit(): void;
  onReprint(): void;
  onRemove(): void;
}

/** Reimprimir sempre; Editar e Apagar (2º clique confirma) só com o dia aberto. */
function RowActions(props: RowActionsProps) {
  const { consumption, locked } = props;
  const remove = useConfirmTwice(props.onRemove);
  const who = `o consumo de ${consumption.consumerName}`;
  return (
    <td className="row-actions">
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Reimprimir ${who}`}
        title="Reimprimir"
        onClick={props.onReprint}
      >
        <Printer aria-hidden />
      </button>
      {!locked && (
        <>
          <button
            type="button"
            className="button button-secondary button-sm"
            aria-label={`Editar ${who}`}
            onClick={props.onEdit}
          >
            <Pencil aria-hidden />
            Editar
          </button>
          <button
            type="button"
            className="button-ghost button-sm button-danger"
            aria-label={
              remove.armed ? `Confirmar: apagar ${who}` : `Apagar ${who}`
            }
            onClick={remove.press}
            onBlur={remove.disarm}
          >
            <Trash2 aria-hidden />
            {remove.armed ? 'Confirmar' : 'Apagar'}
          </button>
        </>
      )}
    </td>
  );
}

/** As chamadas da lista: apagar e reimprimir, com o erro numa faixa só. */
function useListActions(cash: CashApi, onChanged: () => void) {
  const [error, setError] = useState<string | null>(null);
  const printer = usePrinter();
  const ticket = useTicketSettings();
  const remove = async (consumption: StaffConsumption) => {
    try {
      await cash.deleteStaffConsumption(consumption.id);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  const reprint = (consumption: StaffConsumption) =>
    setError(
      printSafely(printer, staffConsumptionReceipt(consumption, ticket)),
    );
  return { error, remove, reprint };
}

/**
 * O consumo interno do dia (2026-10-23): hora, para quem, os itens e o custo de cada lançamento.
 * O custo (CMV) é só do admin (hotfix de 2026-10-24; desde 2026-10-25 a API nem manda ao caixa):
 * a coluna aparece quando o custo vem.
 */
export function StaffConsumptionList({
  cash,
  consumptions,
  locked,
  onEdit,
  onChanged,
}: StaffConsumptionListProps) {
  const actions = useListActions(cash, onChanged);
  const showCost = consumptions.some((c) => costOf(c) !== null);
  if (consumptions.length === 0)
    return (
      <EmptyState
        title="Nenhum consumo neste dia"
        hint="Use o formulário ao lado para anotar o que a equipe comeu ou bebeu."
      />
    );
  return (
    <div className="card card-flush">
      {actions.error && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
      <div className="table-scroll">
        <table className="table" aria-label="Consumo interno do dia">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Para quem</th>
              <th>Itens</th>
              {showCost && <th className="num">Custo</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {consumptions.map((consumption) => (
              <tr key={consumption.id}>
                <td className="tabular-nums">
                  {formatOrderTime(consumption.createdAt)}
                </td>
                <td className="strong">{consumption.consumerName}</td>
                <td>
                  <ItemTree rows={treeOfOrderItems(consumption.items)} />
                </td>
                {showCost && <ConsumptionCostCell cost={costOf(consumption)} />}
                <RowActions
                  consumption={consumption}
                  locked={locked}
                  onEdit={() => onEdit(consumption)}
                  onReprint={() => actions.reprint(consumption)}
                  onRemove={() => void actions.remove(consumption)}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
