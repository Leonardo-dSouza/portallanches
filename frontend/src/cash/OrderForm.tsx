import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { CashApi } from '../api/cash-api';
import { formatMoney } from '../api/money';
import type { CashShortcuts, Order } from '../api/types';
import { Clock, Printer } from 'lucide-react';
import { SwitchField } from '../components/SwitchField';
import { usePrinter } from '../print/printer-context';
import { useAutoPrint } from '../print/use-auto-print';
import { ManagerAuthDialog } from '../manager/ManagerAuthDialog';
import { HomonymAddressDialog } from './HomonymAddressDialog';
import { useCashShortcuts } from '../settings/app-settings-context';
import { OrderFormActions } from './OrderFormActions';
import { OrderFormFields } from './OrderFormFields';
import { OrderItemField } from './OrderItemField';
import { OrderLines } from './OrderLines';
import { focusChoice } from './choice-keys';
import { formatOrderTime } from './order-time';
import { FiadoFields } from './FiadoFields';
import { PaymentKeys } from './PaymentKeys';
import { ChangeForField } from './ChangeForField';
import { OrderTotals } from './OrderTotals';
import { matchesShortcut } from './shortcut-keys';
import { useConfirmTwice, type ConfirmTwice } from './use-confirm-twice';
import type { CashDay } from './use-cash-day';
import { useAddonPanel, type AddonPanelState } from './use-addon-panel';
import { useOrderForm, type OrderFormState } from './use-order-form';
import { useIsPhone } from './use-phone-layout';
import { PhoneOrderSteps } from './PhoneOrderSteps';
import { usePhoneOrderStep } from './use-phone-order-step';

interface OrderFormProps {
  cash: CashApi;
  day: CashDay;
  editing: Order | null;
  onSaved(): void;
  onCancelEdit(): void;
  /** Ref para o card da OrderList: o celular rola até ele após salvar. */
  orderListRef?: RefObject<HTMLElement | null>;
  /** Fn que substitui `window.matchMedia` nos testes de celular (ver `useIsPhone`). */
  matchMediaFn?: (query: string) => MediaQueryList;
}

/** Enter num campo da entrega vai para o próximo campo (como Tab), sem salvar pela metade. */
function focusNextField(form: HTMLFormElement, current: HTMLElement): void {
  const fields = [
    ...form.querySelectorAll<HTMLElement>('input:not([type=radio])'),
  ];
  fields[fields.indexOf(current) + 1]?.focus();
}

interface ShortcutTargets {
  form: OrderFormState;
  panel: AddonPanelState;
  clear: ConfirmTwice;
  editing: boolean;
}

/** O que cada atalho de Cadastros → Comanda e ajustes faz (2026-10-15: teclas escolhidas). */
function runShortcut(action: keyof CashShortcuts, targets: ShortcutTargets) {
  const { form, panel, clear, editing } = targets;
  if (action === 'save') void form.submit();
  if (action === 'toggleType') form.toggleType();
  if (action === 'toggleDining') form.toggleDining();
  if (action === 'addons') panel.openLast(form.items.lines);
  if (action === 'clearAll' && !editing) clear.press();
}

/**
 * Atalhos na captura: valem de qualquer campo, antes do Enter do Item ou do pagamento (senão
 * um Shift+Enter escolhido para salvar viraria "pôr o item").
 */
function shortcutHandler(shortcuts: CashShortcuts, targets: ShortcutTargets) {
  const actions = Object.keys(shortcuts) as (keyof CashShortcuts)[];
  return (event: KeyboardEvent<HTMLFormElement>) => {
    const action = actions.find((name) =>
      matchesShortcut(event, shortcuts[name]),
    );
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action !== 'clearAll') targets.clear.disarm();
    runShortcut(action, targets);
  };
}

/** Enter num campo da entrega vai ao próximo; qualquer outra tecla desarma o Limpar tudo. */
function fieldKeyHandler(clear: ConfirmTwice) {
  return (event: KeyboardEvent<HTMLFormElement>) => {
    clear.disarm();
    if (event.defaultPrevented) return;
    if (event.key !== 'Enter' || event.ctrlKey || event.shiftKey) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    focusNextField(event.currentTarget, event.target);
  };
}

/**
 * A comanda: digitação em sequência, pensada para copiar as comandas de papel no fim da
 * noite sem tirar a mão do bloco numérico (Qtd → Enter → Item → Enter; no fim, Enter com os
 * dois vazios → 1 a 4 → [meio da maquininha 1 a 3] → Enter).
 *
 * No celular (2026-11-05): renderiza as duas telas do modo garçom (PhoneOrderSteps), sem o
 * campo Qtd; `useIsPhone` aceita `matchMediaFn` para controle nos testes.
 */
export function OrderForm({
  cash,
  day,
  editing,
  onSaved,
  onCancelEdit,
  orderListRef,
  matchMediaFn,
}: OrderFormProps) {
  const isPhone = useIsPhone(matchMediaFn);
  const quantityRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const panel = useAddonPanel(quantityRef);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLFieldSetElement>(null);
  const fiadoPhoneRef = useRef<HTMLInputElement>(null);
  const [autoPrint, setAutoPrint] = useAutoPrint();

  // No celular (2026-11-05): `focus.entry` aponta para o `nullQuantityRef` (que nunca monta),
  // então os `focus()` de blankForm e toggleType não abrem o teclado móvel.
  const nullRef = useRef<HTMLInputElement>(null);
  const focusEntry = isPhone ? nullRef : quantityRef;

  const phoneStep = usePhoneOrderStep(editing);

  // No celular (2026-11-05): após salvar vai para 'build' e rola até a lista de pedidos.
  const handleSaved = () => {
    if (isPhone) {
      phoneStep.goToBuild();
      requestAnimationFrame(() => {
        orderListRef?.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
    onSaved();
  };

  const form = useOrderForm({
    printer: usePrinter(),
    autoPrint,
    cash,
    zones: day.zones,
    methods: day.paymentMethods,
    menu: day.menu,
    editing,
    onSaved: handleSaved,
    focus: { entry: focusEntry, phone: phoneRef },
  });
  const clear = useConfirmTwice(form.clearAll);
  const shortcuts = useCashShortcuts();
  const targets = { form, panel, clear, editing: editing !== null };
  // A comanda abre (e reabre na edição, que remonta pelo `key`) pronta para digitar: no Qtd.
  // No celular (2026-11-05): não foca automaticamente para não abrir o teclado virtual.
  useEffect(() => {
    if (!isPhone) quantityRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  const focusPayment = () => focusChoice(paymentRef.current);

  if (isPhone) {
    return (
      <>
        <form
          className="card order-form order-form-phone"
          onSubmit={handleSubmit}
        >
          <PhoneOrderSteps
            day={day}
            editing={editing}
            form={form}
            step={phoneStep.step}
            onGoToClose={phoneStep.goToClose}
            onGoToBuild={phoneStep.goToBuild}
            onCancelEdit={onCancelEdit}
          />
        </form>
        {/* Fora do <form>: o submit da janela não pode virar o "Salvar" da comanda. */}
        <ManagerAuthDialog retry={form.retry} />
        <HomonymAddressDialog question={form.homonym} />
      </>
    );
  }

  return (
    <>
      <form
        className="card order-form"
        onSubmit={handleSubmit}
        onKeyDownCapture={shortcutHandler(shortcuts, targets)}
        onKeyDown={fieldKeyHandler(clear)}
      >
        {/* O interruptor subiu para a faixa do título (2026-10-11): embaixo do Salvar, ele
          empurrava o botão para fora da tela de 1366×768. Por PC: só o do caixa tem a
          térmica e o Chrome com --kiosk-printing. */}
        {/* Editando (2026-10-15): faixa carvão, para ninguém achar que é um pedido novo. */}
        <div
          className="order-form-head"
          data-editing={editing ? true : undefined}
        >
          <h2>
            {editing ? `Editando #${editing.dayNumber}` : 'Novo pedido'}
            {editing && (
              <small title="Hora do lançamento">
                <Clock aria-hidden />
                <span className="sr-only">lançado às</span>
                {formatOrderTime(editing.createdAt)}
              </small>
            )}
          </h2>
          <SwitchField
            label="Imprimir ao salvar"
            checked={autoPrint}
            onChange={setAutoPrint}
            Icon={Printer}
          />
        </div>
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
        <OrderLines
          items={form.items}
          menu={day.menu}
          panel={panel}
          saved={form.savedLines}
        />
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
          onFiadoChosen={() => {
            form.chooseFiado();
            fiadoPhoneRef.current?.focus();
          }}
        />
        <FiadoFields
          form={form}
          zones={day.zones}
          businessDate={day.closing.businessDate}
          debtors={day.fiadoDebtors}
          editing={editing}
          phoneRef={fiadoPhoneRef}
        />
        <ChangeForField
          form={form}
          methods={day.paymentMethods}
          changeRef={changeRef}
        />
        <OrderTotals form={form} editing={editing} />
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
        <OrderFormActions
          form={form}
          editing={editing}
          onCancelEdit={onCancelEdit}
          clear={clear}
        />
      </form>
      {/* Fora do <form>: o submit da janela não pode virar o "Salvar" da comanda. As teclas
        1 e 2 da janela do homônimo também não podem virar formas de pagamento. */}
      <ManagerAuthDialog retry={form.retry} />
      <HomonymAddressDialog question={form.homonym} />
    </>
  );
}
