import { formatMoney } from '../api/money';
import type { MotoboyRate } from '../api/types';
import { formatDate } from '../history/date-keys';

interface RateGroupCardProps {
  label: string;
  note?: string;
  history: MotoboyRate[];
  current: MotoboyRate | null;
  today: string;
}

function historyTag(
  rate: MotoboyRate,
  current: MotoboyRate | null,
  today: string,
) {
  if (rate.id === current?.id)
    return (
      <span className="tag" data-status="OPEN">
        Vigente
      </span>
    );
  if (rate.effectiveFrom > today)
    return (
      <span className="tag" data-kind="DELIVERY">
        Agendada
      </span>
    );
  return null;
}

/** Um grupo de dias: valor em vigor em destaque e o histórico de mudanças logo abaixo. */
export function RateGroupCard({
  label,
  note,
  history,
  current,
  today,
}: RateGroupCardProps) {
  return (
    <section className="card rate-card" aria-label={label}>
      <h2>{label}</h2>
      {note && <p className="hint">{note}</p>}
      {current ? (
        <p className="rate-current">
          {formatMoney(current.amount)}{' '}
          <span>desde {formatDate(current.effectiveFrom)}</span>
        </p>
      ) : (
        <p className="form-error">
          Sem diária em vigor: cadastre uma para poder abrir esses dias.
        </p>
      )}
      <ul className="rate-history">
        {history.map((rate) => (
          <li key={rate.id}>
            <span>{formatDate(rate.effectiveFrom)}</span>
            <strong>{formatMoney(rate.amount)}</strong>
            {historyTag(rate, current, today)}
          </li>
        ))}
      </ul>
    </section>
  );
}
