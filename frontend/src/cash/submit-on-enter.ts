import type { KeyboardEvent } from 'react';
import type { OrderFormState } from './use-order-form';

/**
 * O Enter no último campo da comanda salva, como o Enter nas teclas do pagamento (o Troco e o
 * Nome do cliente no fiado do balcão).
 *
 * @example <TextField label="Troco para" onKeyDown={(event) => submitOnEnter(event, form)} … />
 */
export function submitOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  form: OrderFormState,
): void {
  if (event.key !== 'Enter' || event.ctrlKey) return;
  event.preventDefault();
  void form.submit();
}
