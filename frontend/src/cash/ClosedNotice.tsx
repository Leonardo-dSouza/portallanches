import { useAuth } from '../auth/auth-context';
import type { Closing } from '../api/types';
import { ReopenDayButton } from './ReopenDayButton';

interface ClosedNoticeProps {
  /** O que não pode ser mexido: "pedidos", "gastos". */
  what: string;
  closing: Closing;
  onReopened(): void;
}

/** Aviso do dia fechado; só o admin vê o botão de reabrir. */
export function ClosedNotice({ what, closing, onReopened }: ClosedNoticeProps) {
  const { user } = useAuth();
  return (
    <div className="card notice closed-notice">
      <p>Dia fechado: não é possível lançar nem editar {what}.</p>
      {user?.role === 'ADMIN' && (
        <ReopenDayButton date={closing.businessDate} onReopened={onReopened} />
      )}
    </div>
  );
}
