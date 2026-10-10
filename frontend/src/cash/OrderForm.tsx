import { Check, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { CashApi } from '../api/cash-api';
import { centsToMoney, formatMoney, toApiMoney } from '../api/money';
import type { Order, PaymentMethod } from '../api/types';
import { TextField } from '../components/TextField';
import { OrderFormFields } from './OrderFormFields';
import { OrderItemField } from './OrderItemField';
import { OrderLines } from './OrderLines';
import { focusChoice } from './choice-keys';
import { previewTotalCents } from './order-lines';
import { PaymentKeys } from './PaymentKeys';
import type { CashDay } from './use-cash-day';
import { useAddonPanel, type AddonPanelState } from './use-addon-panel';
import { useOrderForm, type OrderFormState } from './use-order-form';

interface OrderFormProps {
  cash: CashApi;
  day: CashDay;
  editing: Order | null;
  onSaved(): void;
  onCancelEdit(): void;
}

/** Enter num campo da entrega vai para o próximo campo (como Tab), sem salvar pela metade. */
function focusNextField(form: HTMLFormElement, current: HTMLElement): void {
  const fields = [
    ...form.querySelectorAll<HTMLElement>('input:not([type=radio])'),
  ];
  fields[fields.indexOf(current) + 1]?.focus();
}

/** F2 troca o tipo, F4 abre os adicionais da última linha, Ctrl+Enter salva de qualquer campo. */
function shortcutHandler(form: OrderFormState, panel: AddonPanelState) {
  return (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented) return;
    if (event.key === 'F2') {
      event.preventDefault();
      form.toggleType();
    } else if (event.key === 'F4') {
      event.preventDefault();
      panel.openLast(form.items.lines);
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void form.submit();
    } else if (
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      focusNextField(event.currentTarget, event.target);
    }
  };
}

function OrderTotals({ form }: { form: OrderFormState }) {
  const isDelivery = form.values.type === 'DELIVERY';
  const fee = isDelivery ? (toApiMoney(form.values.fee) ?? '') : '';
  const items = previewTotalCents(form.items.lines, '');
  return (
    <dl className="order-totals">
      {isDelivery && (
        <>
          <dt>Itens</dt>
          <dd>{formatMoney(centsToMoney(items))}</dd>
          <dt>Taxa</dt>
          <dd>{formatMoney(fee || '0.00')}</dd>
        </>
      )}
      <dt className="order-total-label">Total</dt>
      <dd className="order-total">
        {formatMoney(centsToMoney(previewTotalCents(form.items.lines, fee)))}
      </dd>
    </dl>
  );
}

/** O Enter no Troco salva (como o Enter nas teclas do pagamento). */
function submitOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  form: OrderFormState,
): void {
  if (event.key !== 'Enter' || event.ctrlKey) return;
  event.preventDefault();
  void form.submit();
}

/** "Troco para" (2026-10-10): só na entrega paga na forma marcada como dinheiro. */
function ChangeForField({
  form,
  methods,
  changeRef,
}: {
  form: OrderFormState;
  methods: PaymentMethod[];
  changeRef: RefObject<HTMLInputElement | null>;
}) {
  const method = methods.find(
    (m) => String(m.id) === form.values.paymentMethodId,
  );
  if (form.values.type !== 'DELIVERY' || !method?.isCash) return null;
  return (
    <TextField
      label="Troco para"
      inputMode="decimal"
      ref={changeRef}
      placeholder="Vazio = sem troco"
      value={form.values.changeFor}
      onChange={(value) => form.setField('changeFor', value)}
      onKeyDown={(event) => submitOnEnter(event, form)}
    />
  );
}

function SubmitButtons({
  form,
  editing,
  onCancelEdit,
}: {
  form: OrderFormState;
  editing: Order | null;
  onCancelEdit(): void;
}) {
  return (
    <>
      <button
        className="button"
        type="submit"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
        {editing ? 'Salvar alterações' : 'Salvar pedido'}
        <kbd aria-hidden>Ctrl+Enter</kbd>
      </button>
      {editing && (
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancelEdit}
        >
          Cancelar edição
        </button>
      )}
    </>
  );
}

/**
 * A comanda: digitação em sequência, pensada para copiar as comandas de papel no fim da
 * noite sem tirar a mão do bloco numérico (Qtd → Enter → Item → Enter; no fim, Enter com os
 * dois vazios → 1 a 4 → [meio da maquininha 1 a 3] → Enter).
 */
export function OrderForm({
  cash,
  day,
  editing,
  onSaved,
  onCancelEdit,
}: OrderFormProps) {
  const quantityRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const panel = useAddonPanel(quantityRef);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLFieldSetElement>(null);
  const form = useOrderForm({
    cash,
    zones: day.zones,
    methods: day.paymentMethods,
    menu: day.menu,
    editing,
    onSaved,
    focus: { entry: quantityRef, phone: phoneRef },
  });
  // A comanda abre (e reabre na edição, que remonta pelo `key`) pronta para digitar: no Qtd.
  useEffect(() => quantityRef.current?.focus(), []);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  const focusPayment = () => focusChoice(paymentRef.current);
  return (
    <form
      className="card order-form"
      onSubmit={handleSubmit}
      onKeyDown={shortcutHandler(form, panel)}
    >
      <h2>{editing ? `Editar pedido #${editing.dayNumber}` : 'Novo pedido'}</h2>
      <OrderFormFields
        form={form}
        zones={day.zones}
        phoneRef={phoneRef}
        nameRef={nameRef}
      />
      {editing && editing.items.length === 0 && (
        <p className="hint">
          Pedido antigo, só com o valor ({formatMoney(editing.amount)}): lance
          os itens.
        </p>
      )}
      <OrderItemField
        items={form.items}
        quantityRef={quantityRef}
        inputRef={itemRef}
        onDone={focusPayment}
      />
      <OrderLines items={form.items} menu={day.menu} panel={panel} />
      <PaymentKeys
        methods={day.paymentMethods}
        value={form.values.paymentMethodId}
        mode={form.values.paymentMode}
        onChange={(value) => form.setField('paymentMethodId', value)}
        onModeChange={(mode) => form.setField('paymentMode', mode)}
        onSubmit={() => void form.submit()}
        groupRef={paymentRef}
        onOpenChosen={
          form.values.type === 'COUNTER'
            ? () => nameRef.current?.focus()
            : undefined
        }
        onCashChosen={() => changeRef.current?.focus()}
      />
      <ChangeForField
        form={form}
        methods={day.paymentMethods}
        changeRef={changeRef}
      />
      <OrderTotals form={form} />
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
      <SubmitButtons
        form={form}
        editing={editing}
        onCancelEdit={onCancelEdit}
      />
    </form>
  );
}
