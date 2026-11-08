import { Check, Eraser, Plus } from 'lucide-react';
import type { Order } from '../api/types';
import { useCashShortcuts } from '../settings/app-settings-context';
import type { ConfirmTwice } from './use-confirm-twice';
import type { OrderFormState } from './use-order-form';

interface OrderFormActionsProps {
  form: OrderFormState;
  editing: Order | null;
  adding?: Order | null;
  onCancelEdit(): void;
  clear: ConfirmTwice;
}

/** No modo acrescentar (2026-11-08): limpa só as linhas novas. */
function ClearNewLinesButton({ clear }: { clear: ConfirmTwice }) {
  const shortcut = useCashShortcuts().clearAll;
  return (
    <button
      className={
        clear.armed ? 'button button-danger' : 'button button-secondary'
      }
      type="button"
      onClick={clear.press}
    >
      {clear.armed ? (
        'Confirmar limpeza'
      ) : (
        <>
          <Eraser aria-hidden />
          Limpar tudo
          <kbd aria-hidden className="kbd-hint">
            {shortcut}
          </kbd>
        </>
      )}
    </button>
  );
}

/** Limpar tudo no pedido novo; Voltar no acrescentar; Cancelar edição na edição. */
function SecondaryAction({
  editing,
  adding,
  onCancelEdit,
  clear,
}: Omit<OrderFormActionsProps, 'form'>) {
  const shortcut = useCashShortcuts().clearAll;
  if (adding)
    return (
      <button
        className="button button-secondary"
        type="button"
        onClick={onCancelEdit}
      >
        Voltar
      </button>
    );
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
          <kbd aria-hidden className="kbd-hint">
            {shortcut}
          </kbd>
        </>
      )}
    </button>
  );
}

/**
 * Salvar e, ao lado (a comanda já encosta no fim da tela de 1366×768), Limpar tudo ou
 * Cancelar edição / Voltar. As teclas mostradas são as de Cadastros → Comanda e ajustes.
 */
export function OrderFormActions(props: OrderFormActionsProps) {
  const { form, editing, adding } = props;
  const isModify = Boolean(editing || adding);
  const shortcut = useCashShortcuts().save;
  return (
    <div className="order-form-actions">
      <button
        className="button"
        type="submit"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        {isModify ? <Check aria-hidden /> : <Plus aria-hidden />}
        {isModify ? 'Salvar alterações' : 'Salvar pedido'}
        <kbd aria-hidden className="kbd-hint">
          {shortcut}
        </kbd>
      </button>
      {adding && <ClearNewLinesButton clear={props.clear} />}
      <SecondaryAction {...props} />
    </div>
  );
}
