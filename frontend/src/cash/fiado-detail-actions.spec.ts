import { fiadoDetailActions } from './fiado-detail-actions';
import type { FiadoTarget } from './fiado-labels';

const TARGET: FiadoTarget = {
  orderId: 50,
  dayNumber: 5,
  businessDate: '2026-09-20',
  customerName: 'Maria',
  amount: '50.00',
  paidTotal: '3.00',
  remaining: '47.00',
  dueDate: null,
};

/** Os passos chamados, na ordem. */
class RecordingSteps {
  calls: string[] = [];
  receive = (target: FiadoTarget) =>
    this.calls.push(`receber ${target.orderId}`);
  reschedule = (target: FiadoTarget) =>
    this.calls.push(`reagendar ${target.orderId}`);
  close = () => this.calls.push('fechar');
}

describe('fiadoDetailActions', () => {
  it('com algo a pagar: fecha a janela do pedido e abre a do passo', () => {
    const steps = new RecordingSteps();
    const actions = fiadoDetailActions(TARGET, steps, steps.close);
    actions?.onReceive();
    actions?.onReschedule();
    expect(steps.calls).toEqual([
      'fechar',
      'receber 50',
      'fechar',
      'reagendar 50',
    ]);
  });

  it('pago ou fora do fiado: sem teclas', () => {
    const steps = new RecordingSteps();
    expect(
      fiadoDetailActions({ ...TARGET, remaining: '0.00' }, steps, steps.close),
    ).toBeUndefined();
    expect(fiadoDetailActions(null, steps, steps.close)).toBeUndefined();
  });
});
