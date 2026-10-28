import type { CashApi } from '../api/cash-api';
import type { FiadoOrderView } from '../api/fiado-types';
import { Dialog } from '../components/Dialog';
import { Skeleton } from '../components/Skeleton';
import { fiadoDetailActions } from '../cash/fiado-detail-actions';
import { fiadoOrderLabel } from '../cash/fiado-labels';
import { OrderDetails } from '../cash/OrderDetails';
import type { CashDay } from '../cash/use-cash-day';
import type { FiadoDialogsState } from '../cash/use-fiado-dialogs';
import { useNow } from '../cash/use-now';
import { useOrderActions } from '../cash/use-order-actions';
import { useReprint } from '../cash/use-reprint';
import { formatDayLabel } from '../history/date-keys';
import { useOrderById } from './use-order-by-id';

interface FiadoOrderDetailsProps {
  cash: CashApi;
  day: CashDay;
  view: FiadoOrderView;
  customerName: string;
  /** Noite fechada: sem Receber pagamento nem Reagendar pagamento. */
  locked: boolean;
  steps: FiadoDialogsState;
  onChanged(): void;
  onClose(): void;
}

/** Só leitura: o pedido é de outra noite, e a janela não mostra Editar nem Cancelar. */
const READ_ONLY = () => undefined;

/** Enquanto o pedido chega (ou se a API recusou), a janela já aberta com o número e a noite. */
function PendingOrder(props: {
  title: string;
  error: string | null;
  onClose(): void;
}) {
  return (
    <Dialog title={props.title} onClose={props.onClose}>
      {props.error ? (
        <p className="form-error" role="alert">
          {props.error}
        </p>
      ) : (
        <Skeleton label="Carregando o pedido…" />
      )}
    </Dialog>
  );
}

/**
 * O pedido fiado inteiro na aba Fiado (pedido do usuário, 2026-10-27), na mesma janela da lista:
 * itens com o unitário, endereço, taxa, pagamento e histórico, com Reimprimir e as teclas do
 * fiado.
 */
export function FiadoOrderDetails(props: FiadoOrderDetailsProps) {
  const { cash, day, view } = props;
  const { order, error } = useOrderById(cash, view.orderId);
  const actions = useOrderActions(cash, props.onChanged);
  const reprint = useReprint(day);
  const now = useNow();
  if (!order)
    return (
      <PendingOrder
        title={fiadoOrderLabel(view)}
        error={error}
        onClose={props.onClose}
      />
    );
  const target = { ...view, customerName: props.customerName };
  return (
    <OrderDetails
      cash={cash}
      order={order}
      day={day}
      locked
      actions={actions}
      now={now}
      onEdit={READ_ONLY}
      onCancel={READ_ONLY}
      onReprint={reprint}
      onClose={props.onClose}
      nightLabel={formatDayLabel(view.businessDate)}
      fiado={fiadoDetailActions(
        props.locked ? null : target,
        props.steps,
        props.onClose,
      )}
    />
  );
}
