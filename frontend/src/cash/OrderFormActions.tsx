import { Check, Eraser, Plus } from 'lucide-react';
import type { Order } from '../api/types';
import { useCashShortcuts } from '../settings/app-settings-context';
import type { ConfirmTwice } from './use-confirm-twice';
import type { OrderFormState } from './use-order-form';

interface OrderFormActionsProps {
  form: OrderFormState;
  editing: Order | null;
  onCancelEdit(): void;
  clear: ConfirmTwice;
}

/** Limpar tudo só no pedido novo; na edição o par é o "Cancelar edição". */
function SecondaryAction({
  editing,
  onCancelEdit,
  clear,
}: Omit<OrderFormActionsProps, 'form'>) {
  const shortcut = useCashShortcuts().clearAll;
  if (editing)
    return (
      <button
        className="button button-secondary"
        type="button"
        onClick={onCancelEdit}
      >
        Cancelar edição
      </button>
    );
  return (
    <button
      className={
        clear.armed ? 'button button-danger' : 'button button-secondary'
      }
      type="button"
      onClick={clear.press}
    >
      {/* Armado, só o texto: "Confirmar limpeza" com ícone e tecla não cabe ao lado do Salvar. */}
      {clear.armed ? (
        'Confirmar limpeza'
      ) : (
        <>
          <Eraser aria-hidden />
          Limpar tudo
          <kbd aria-hidden>{shortcut}</kbd>
        </>
      )}
    </button>
  );
}

/**
 * Salvar e, ao lado (a comanda já encosta no fim da tela de 1366×768), Limpar tudo ou
 * Cancelar edição. As teclas mostradas são as de Cadastros → Comanda e ajustes.
 */
export function OrderFormActions(props: OrderFormActionsProps) {
  const { form, editing } = props;
  const shortcut = useCashShortcuts().save;
  return (
    <div className="order-form-actions">
      <button
        className="button"
        type="submit"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
        {editing ? 'Salvar alterações' : 'Salvar pedido'}
        <kbd aria-hidden>{shortcut}</kbd>
      </button>
      <SecondaryAction {...props} />
    </div>
  );
}
