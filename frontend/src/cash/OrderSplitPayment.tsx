import { centsToMoney, formatMoney } from '../api/money';
import type { PaymentMethod } from '../api/types';
import { PaymentKeys } from './PaymentKeys';
import { SplitPaymentPanel } from './SplitPaymentPanel';
import type { OrderFormState } from './use-order-form';

interface OrderSplitProps {
  form: OrderFormState;
  methods: PaymentMethod[];
}

/**
 * O Dividir da comanda (card 2), no computador e no celular. O "Troco para" só na entrega: o
 * balcão nunca teve troco (a API recusa).
 *
 * @example <OrderSplitPanel form={form} methods={day.paymentMethods} onCancel={focusPayment} />
 */
export function OrderSplitPanel({
  form,
  methods,
  onCancel,
}: OrderSplitProps & { onCancel(): void }) {
  return (
    <SplitPaymentPanel
      totalCents={form.split.totalCents}
      methods={methods}
      parts={form.values.splitParts}
      allowChange={form.values.type === 'DELIVERY'}
      changeFor={form.values.changeFor}
      onChange={form.split.setParts}
      onChangeFor={(changeFor) => form.setField('changeFor', changeFor)}
      onCancel={() => {
        form.split.close();
        onCancel();
      }}
      onCollapse={(kept) => {
        form.split.collapseTo(kept);
        onCancel();
      }}
      onSubmit={() => void form.submit()}
    />
  );
}

/**
 * + Item em pedido dividido (card 2): "Acréscimo R$ X pago em:", com a forma da última parte já
 * marcada (Enter salva). Sem a Fiado: fiado não divide.
 *
 * @example {form.split.asksAddOn && <SplitAddonPayment form={form} methods={methods} />}
 */
export function SplitAddonPayment({ form, methods }: OrderSplitProps) {
  const { split } = form;
  return (
    <div className="split-addon-payment">
      <p className="split-addon-title">
        Acréscimo {formatMoney(centsToMoney(split.addedCents))} pago em:
      </p>
      <PaymentKeys
        methods={methods.filter((m) => !m.isFiado)}
        value={split.addOn.methodId}
        mode={split.addOn.mode}
        onChange={split.setAddOnMethod}
        onModeChange={split.setAddOnMode}
        onSubmit={() => void form.submit()}
      />
    </div>
  );
}
