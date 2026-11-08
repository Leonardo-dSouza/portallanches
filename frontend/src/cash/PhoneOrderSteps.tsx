import { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Order } from '../api/types';
import { ItemTree } from './ItemTree';
import { treeOfOrderItems } from './item-tree';
import { ComandaBar } from './ComandaBar';
import { MenuGrid } from './MenuGrid';
import { OrderFormActions } from './OrderFormActions';
import { OrderFormFields } from './OrderFormFields';
import { OrderItemField } from './OrderItemField';
import { OrderLines } from './OrderLines';
import { FiadoFields } from './FiadoFields';
import { PaymentKeys } from './PaymentKeys';
import { ChangeForField } from './ChangeForField';
import { OrderTotals } from './OrderTotals';
import { categoriesOf } from './menu-grid';
import { sellableMenu } from './line-choice';
import { useConfirmTwice } from './use-confirm-twice';
import { useAddonPanel } from './use-addon-panel';
import type { CashDay } from './use-cash-day';
import type { OrderFormState } from './use-order-form';
import type { PhoneOrderStep } from './use-phone-order-step';

/** Título da tela FECHAR: "Acrescentar ao #N", "Editando #N" ou "Fechar pedido". */
function CloseScreenTitle({
  editing,
  adding,
}: {
  editing: Order | null;
  adding?: Order | null;
}) {
  if (adding) return <h2>Acrescentar ao #{adding.dayNumber}</h2>;
  if (editing) return <h2>Editando #{editing.dayNumber}</h2>;
  return <h2>Fechar pedido</h2>;
}

/** Faixa no topo da tela MONTAR ao acrescentar item no celular. */
function PhoneBuildBanner({
  adding,
  onCancel,
}: {
  adding: Order;
  onCancel(): void;
}) {
  return (
    <div className="phone-build-add-banner">
      <button
        type="button"
        className="button button-secondary button-sm"
        onClick={onCancel}
      >
        <ArrowLeft aria-hidden />
        Voltar
      </button>
      <span className="font-semibold text-sm">
        Acrescentar ao #{adding.dayNumber}
        {adding.customerName ? ` · ${adding.customerName}` : ''}
      </span>
    </div>
  );
}

export interface PhoneOrderStepsProps {
  day: CashDay;
  editing: Order | null;
  adding?: Order | null;
  form: OrderFormState;
  step: PhoneOrderStep;
  onGoToClose(): void;
  onGoToBuild(): void;
  onCancelEdit(): void;
}

/**
 * Duas telas do modo garçom no celular (2026-11-05):
 *   MONTAR — campo de busca, chips de categoria, grade de itens e barra fixa de resumo.
 *   FECHAR — linhas da comanda, pagamento, totais e botão Salvar.
 */
export function PhoneOrderSteps({
  day,
  editing,
  adding,
  form,
  step,
  onGoToClose,
  onGoToBuild,
  onCancelEdit,
}: PhoneOrderStepsProps) {
  const categories = categoriesOf(sellableMenu(day.menu));
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? '');
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLFieldSetElement>(null);
  const fiadoPhoneRef = useRef<HTMLInputElement>(null);
  // No celular (2026-11-05): sem campo Qtd, o nullRef garante que os focus() de
  // use-order-form.ts não abram o teclado móvel automaticamente.
  const nullQuantityRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const panel = useAddonPanel(nullQuantityRef);
  const clear = useConfirmTwice(form.clearAll);

  const choosePaymentMethod = (value: string) =>
    form.setField('paymentMethodId', value);

  if (step === 'build') {
    return (
      <>
        {adding && <PhoneBuildBanner adding={adding} onCancel={onCancelEdit} />}
        <div className="phone-build-search">
          <OrderItemField
            items={form.items}
            quantityRef={nullQuantityRef}
            inputRef={itemInputRef}
            onDone={adding ? () => void form.submit() : onGoToClose}
            phoneMode
          />
        </div>
        {form.error && (
          <p className="form-error" role="alert">
            {form.error}
          </p>
        )}
        <MenuGrid
          menu={sellableMenu(day.menu)}
          lines={form.items.lines}
          searchText={form.items.text}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onPick={(item) => form.items.pick(item)}
        />
        <ComandaBar lines={form.items.lines} onOpenClose={onGoToClose} />
      </>
    );
  }

  // Tela FECHAR
  return (
    <>
      <div className="phone-close-head">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={onGoToBuild}
        >
          <ArrowLeft aria-hidden />
          Cardápio
        </button>
        <CloseScreenTitle editing={editing} adding={adding} />
      </div>
      {adding && (
        <div className="phone-close-existing-items" aria-label="Itens atuais">
          <ItemTree rows={treeOfOrderItems(adding.items)} />
        </div>
      )}
      {/* O OrderLines já abre o painel de adicionais embaixo da linha; no celular ele não foca
          a Observação, para o teclado não cobrir os adicionais. */}
      <OrderLines
        items={form.items}
        menu={day.menu}
        panel={panel}
        saved={form.savedLines}
        autoFocusNote={false}
      />
      {!adding && (
        <>
          <OrderFormFields
            form={form}
            zones={day.zones}
            phoneRef={phoneRef}
            nameRef={nameRef}
          />
          <PaymentKeys
            methods={day.paymentMethods}
            value={form.values.paymentMethodId}
            mode={form.values.paymentMode}
            onChange={choosePaymentMethod}
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
        </>
      )}
      <OrderTotals form={form} editing={adding ?? editing} />
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
        adding={adding}
        onCancelEdit={onCancelEdit}
        clear={clear}
      />
      <div className="phone-close-extra-space" aria-hidden />
    </>
  );
}
