import { NotebookPen } from 'lucide-react';
import type { RefObject } from 'react';
import type { FiadoDebtor } from '../api/fiado-types';
import type { DeliveryZone, Order } from '../api/types';
import { OptionalDateField } from '../calendar/OptionalDateField';
import { CustomerNameFields } from './CustomerNameFields';
import { fiadoDebtText } from './fiado-debt';
import { submitOnEnter } from './submit-on-enter';
import type { OrderFormState } from './use-order-form';

interface FiadoFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  /** Noite do caixa: o "Pagar em" começa nela (a API recusa antes da noite do pedido). */
  businessDate: string;
  /** Quem deve (`GET /fiado/open`), para o "Já deve". */
  debtors: FiadoDebtor[];
  editing: Order | null;
  /** Telefone do cliente no balcão: a tecla Fiado leva o foco para ele. */
  phoneRef: RefObject<HTMLInputElement | null>;
}

/**
 * Fiado na comanda (2026-10-25): pendurado nas teclas do pagamento pelo mesmo fio mostarda do
 * meio da maquininha. No balcão pede o cliente (Telefone → Enter → Nome → Enter salva); na entrega
 * o cliente já está em cima. Mostra quanto ele já deve e o "Pagar em" (opcional).
 */
export function FiadoFields(props: FiadoFieldsProps) {
  const { form } = props;
  if (!form.fiado) return null;
  const debt = fiadoDebtText(
    form.knownCustomerId,
    props.debtors,
    props.editing,
  );
  return (
    <fieldset className="fiado-slip">
      <legend>
        <NotebookPen aria-hidden />
        Paga depois
      </legend>
      {form.values.type === 'COUNTER' && (
        <CustomerNameFields
          form={form}
          zones={props.zones}
          phoneRef={props.phoneRef}
          onNameKeyDown={(event) => submitOnEnter(event, form)}
        />
      )}
      {debt && <p className="fiado-debt">{debt}</p>}
      <OptionalDateField
        label="Pagar em"
        emptyText="Sem data"
        value={form.values.fiadoDueDate}
        today={props.businessDate}
        notBefore={props.businessDate}
        onChange={(date) => form.setField('fiadoDueDate', date)}
      />
    </fieldset>
  );
}
