import type { FiadoPayment } from '../api/fiado-types';
import type { Closing, UserRole } from '../api/types';

/**
 * Quem vê o Estornar (2026-11-01): depende do recebimento, não da noite aberta na tela. O admin
 * estorna qualquer um; o caixa, só o da noite em andamento, a mesma regra da API.
 *
 * @example canCancelPayment({ businessDate: '2026-10-31' }, 'CAIXA', noiteDeHoje) // false
 */
export function canCancelPayment(
  payment: Pick<FiadoPayment, 'businessDate'>,
  role: UserRole | undefined,
  closing: Pick<Closing, 'businessDate' | 'status'>,
): boolean {
  if (role === 'ADMIN') return true;
  return (
    closing.status === 'OPEN' && payment.businessDate === closing.businessDate
  );
}
