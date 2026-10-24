import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { Printer, UtensilsCrossed } from 'lucide-react';
import type { CashApi } from '../api/cash-api';
import type { StaffConsumption } from '../api/staff-consumption-types';
import type { CashShortcuts } from '../api/types';
import { OrderItemField } from '../cash/OrderItemField';
import { OrderLines } from '../cash/OrderLines';
import { matchesShortcut } from '../cash/shortcut-keys';
import { useAddonPanel, type AddonPanelState } from '../cash/use-addon-panel';
import type { CashDay } from '../cash/use-cash-day';
import { SwitchField } from '../components/SwitchField';
import { TextField } from '../components/TextField';
import { usePrinter } from '../print/printer-context';
import { useAutoPrint } from '../print/use-auto-print';
import { useCashShortcuts } from '../settings/app-settings-context';
import {
  useStaffConsumptionForm,
  type StaffConsumptionFormState,
} from './use-staff-consumption-form';

interface StaffConsumptionFormProps {
  cash: CashApi;
  day: CashDay;
  editing: StaffConsumption | null;
  onSaved(): void;
  onCancelEdit(): void;
}

const NAMES_LIST_ID = 'staff-consumer-names';

/** Os atalhos da comanda que valem aqui: salvar e o painel de adicionais (não há tipo nem pagamento). */
function shortcutHandler(
  shortcuts: CashShortcuts,
  form: StaffConsumptionFormState,
  panel: AddonPanelState,
) {
  return (event: KeyboardEvent<HTMLFormElement>) => {
    const save = matchesShortcut(event, shortcuts.save);
    const addons = matchesShortcut(event, shortcuts.addons);
    if (!save && !addons) return;
    event.preventDefault();
    event.stopPropagation();
    if (save) void form.submit();
    else panel.openLast(form.items.lines);
  };
}

/** O Enter no "Para quem" vai ao Qtd, como o Enter dos campos da entrega no pedido. */
function focusQuantityOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  quantityRef: RefObject<HTMLInputElement | null>,
): void {
  if (event.key !== 'Enter' || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  quantityRef.current?.focus();
}

function FormMessages({ form }: { form: StaffConsumptionFormState }) {
  return (
    <>
      {form.notice && (
        <p className="form-notice" role="status">
          {form.notice}
        </p>
      )}
      {form.error && (
        <p className="form-error" role="alert">
          {form.error}
        </p>
      )}
    </>
  );
}

function FormActions({
  form,
  editing,
  onCancelEdit,
}: {
  form: StaffConsumptionFormState;
  editing: boolean;
  onCancelEdit(): void;
}) {
  const shortcut = useCashShortcuts().save;
  return (
    <div className="order-form-actions">
      <button
        type="submit"
        className="button"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        <UtensilsCrossed aria-hidden />
        Salvar consumo
        <kbd aria-hidden>{shortcut}</kbd>
      </button>
      {editing && (
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancelEdit}
        >
          Cancelar edição
        </button>
      )}
    </div>
  );
}

/**
 * Lançamento do consumo interno (2026-10-23): para quem e os itens, com o mesmo teclado da
 * comanda do pedido (Qtd → Item, "+bacon", "/obs", F4), sem pagamento e sem preços. Enter com o
 * Qtd e o Item vazios salva.
 */
export function StaffConsumptionForm({
  cash,
  day,
  editing,
  onSaved,
  onCancelEdit,
}: StaffConsumptionFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const panel = useAddonPanel(quantityRef);
  const [autoPrint, setAutoPrint] = useAutoPrint();
  const form = useStaffConsumptionForm({
    cash,
    menu: day.menu,
    editing,
    onSaved,
    nameRef,
    printer: usePrinter(),
    autoPrint,
  });
  const shortcuts = useCashShortcuts();
  useEffect(() => nameRef.current?.focus(), []);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form
      className="card order-form"
      onSubmit={handleSubmit}
      onKeyDownCapture={shortcutHandler(shortcuts, form, panel)}
    >
      <div
        className="order-form-head"
        data-editing={editing ? true : undefined}
      >
        <h2>
          {editing
            ? `Editando o consumo de ${editing.consumerName}`
            : 'Novo consumo'}
        </h2>
        <SwitchField
          label="Imprimir ao salvar"
          checked={autoPrint}
          onChange={setAutoPrint}
          Icon={Printer}
        />
      </div>
      <TextField
        label="Para quem"
        ref={nameRef}
        list={NAMES_LIST_ID}
        autoComplete="off"
        maxLength={40}
        placeholder="Motoboy, Equipe…"
        value={form.consumerName}
        onChange={form.setConsumerName}
        onKeyDown={(event) => focusQuantityOnEnter(event, quantityRef)}
      />
      <datalist id={NAMES_LIST_ID}>
        {day.consumerNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <OrderItemField
        items={form.items}
        quantityRef={quantityRef}
        inputRef={itemRef}
        onDone={() => void form.submit()}
      />
      <OrderLines
        items={form.items}
        menu={day.menu}
        panel={panel}
        saved={form.savedLines}
        prices={false}
      />
      <FormMessages form={form} />
      <FormActions
        form={form}
        editing={editing !== null}
        onCancelEdit={onCancelEdit}
      />
    </form>
  );
}
