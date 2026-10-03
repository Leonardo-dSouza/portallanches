import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import { formatMoney } from '../api/money';
import { formatQuantity } from '../api/quantity';
import type { StockEntryRecord } from '../api/types';
import { formatDate, toDateKey } from '../history/date-keys';
import type { EntryHistoryState } from './use-entry-history';

const dayOf = (iso: string): string =>
  formatDate(toDateKey(new Date(iso))).slice(0, 5);

function describeCost(entry: StockEntryRecord): string {
  if (entry.unitCost === null) return '—';
  return `${formatMoney(entry.unitCost)} / ${entry.countUnit}`;
}

interface UndoButtonProps {
  entry: StockEntryRecord;
  busy: boolean;
  onConfirm(): void;
}

/** Dois passos, como fechar o dia: o primeiro clique só pergunta. */
function UndoButton({ entry, busy, onConfirm }: UndoButtonProps) {
  const [asking, setAsking] = useState(false);
  if (entry.reversedAt) return <span className="tag">Desfeita</span>;
  if (!entry.reversible)
    return <span className="muted-cell">Já mexida: corrija na contagem</span>;
  return (
    <button
      type="button"
      className={asking ? 'mark-button entry-undo-confirm' : 'mark-button'}
      disabled={busy}
      aria-busy={busy}
      aria-label={
        asking
          ? `Confirmar: desfazer entrada de ${entry.supplyName}`
          : `Desfazer entrada de ${entry.supplyName}`
      }
      onClick={() => (asking ? onConfirm() : setAsking(true))}
    >
      <Undo2 aria-hidden />
      {asking ? 'Confirmar' : 'Desfazer'}
    </button>
  );
}

function HistoryRow(props: {
  entry: StockEntryRecord;
  history: EntryHistoryState;
}) {
  const { entry, history } = props;
  return (
    <tr data-inactive={entry.reversedAt !== null}>
      <td className="muted-cell">{dayOf(entry.createdAt)}</td>
      <td className="strong">{entry.supplyName}</td>
      <td className="num">
        {formatQuantity(entry.quantity)} {entry.countUnit}
      </td>
      <td>{entry.expiresOn ? formatDate(entry.expiresOn) : '—'}</td>
      <td className="num">{describeCost(entry)}</td>
      <td className="muted-cell">{entry.createdByName}</td>
      <td className="row-actions">
        <UndoButton
          entry={entry}
          busy={history.reversing === entry.lotId}
          onConfirm={() => void history.reverse(entry.lotId)}
        />
      </td>
    </tr>
  );
}

/**
 * Últimas entradas (30 dias): conferir o que foi lançado e desfazer o que entrou errado
 * enquanto nada mexeu no lote.
 */
export function EntryHistory({ history }: { history: EntryHistoryState }) {
  const { entries, error } = history;
  return (
    <section className="entry-history">
      <h2>Últimas entradas</h2>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {entries?.length === 0 && (
        <p className="hint">Nenhuma entrada nos últimos 30 dias.</p>
      )}
      {entries && entries.length > 0 && (
        <div className="card card-flush">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Insumo</th>
                  <th className="num">Quantidade</th>
                  <th>Validade</th>
                  <th className="num">Custo pago</th>
                  <th>Quem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <HistoryRow
                    key={entry.lotId}
                    entry={entry}
                    history={history}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
