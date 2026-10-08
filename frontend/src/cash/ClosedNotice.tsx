import type { Closing } from '../api/types';
import { ReopenDayButton } from './ReopenDayButton';

interface ClosedNoticeProps {
  /** O que não pode ser mexido: "pedidos", "gastos". */
  what: string;
  closing: Closing;
  onReopened(): void;
}

/**
 * Aviso do dia fechado, com o botão de reabrir para os dois perfis: a API decide (o caixa
 * só reabre o último dia com fechamento) e a recusa aparece como erro no próprio botão.
 */
export function ClosedNotice({ what, closing, onReopened }: ClosedNoticeProps) {
  return (
    <div className="card notice closed-notice">
      <p>Dia fechado: não é possível lançar nem editar {what}.</p>
      <ReopenDayButton date={closing.businessDate} onReopened={onReopened} />
    </div>
  );
}
