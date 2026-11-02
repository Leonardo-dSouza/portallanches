import { useState } from 'react';
import type { FiadoDebtor, FiadoSettledCustomer } from '../api/fiado-types';
import { formatMoney } from '../api/money';
import { TextField } from '../components/TextField';
import {
  debtorRow,
  matchesDebtor,
  settledRow,
  type FiadoClientRow,
} from './debtor-view';

type ClientView = 'open' | 'settled';

const EMPTY_TEXT: Record<ClientView, string> = {
  open: 'Ninguém deve no fiado.',
  settled: 'Ninguém quitou fiado ainda.',
};

interface DebtorListProps {
  debtors: FiadoDebtor[];
  settled: FiadoSettledCustomer[];
  /** A noite do caixa: diz se a previsão já passou. */
  today: string;
  selectedId: number | null;
  onSelect(customerId: number): void;
}

interface ClientButtonProps {
  row: FiadoClientRow;
  selected: boolean;
  onSelect(customerId: number): void;
}

function ClientButton({ row, selected, onSelect }: ClientButtonProps) {
  return (
    <button
      type="button"
      className="debtor"
      aria-pressed={selected}
      onClick={() => onSelect(row.customerId)}
    >
      <span className="debtor-name">{row.name}</span>
      <strong className="debtor-total">{formatMoney(row.total)}</strong>
      <small>{row.details.join(' · ')}</small>
    </button>
  );
}

interface ViewKeyProps {
  label: string;
  count: number;
  active: boolean;
  onClick(): void;
}

function ViewKey({ label, count, active, onClick }: ViewKeyProps) {
  return (
    <button
      type="button"
      className="toggle-key toggle-key-sm"
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span className="toggle-key-count">{count}</span>
    </button>
  );
}

/**
 * Quem deve (2026-10-25) e quem quitou (2026-11-01), com a mesma busca por nome ou telefone.
 * Escolher abre o extrato ao lado: quitar não pode tirar o caminho até o Estornar.
 */
export function DebtorList(props: DebtorListProps) {
  const { debtors, settled, today, selectedId, onSelect } = props;
  const [view, setView] = useState<ClientView>('open');
  const [query, setQuery] = useState('');
  const rows =
    view === 'open'
      ? debtors.map((debtor) => debtorRow(debtor, today))
      : settled.map(settledRow);
  const shown = rows.filter((row) => matchesDebtor(row, query));
  return (
    <section className="card fiado-debtors" aria-label="Clientes do fiado">
      <div className="fiado-views" role="group" aria-label="Ver clientes">
        <ViewKey
          label="Quem deve"
          count={debtors.length}
          active={view === 'open'}
          onClick={() => setView('open')}
        />
        <ViewKey
          label="Quitados"
          count={settled.length}
          active={view === 'settled'}
          onClick={() => setView('settled')}
        />
      </div>
      <TextField
        label="Buscar cliente"
        type="search"
        placeholder="Nome ou telefone"
        autoComplete="off"
        value={query}
        onChange={setQuery}
      />
      {rows.length === 0 && <p className="page-message">{EMPTY_TEXT[view]}</p>}
      {rows.length > 0 && shown.length === 0 && (
        <p className="page-message">Nenhum cliente com “{query}”.</p>
      )}
      <ul className="debtor-list">
        {shown.map((row) => (
          <li key={row.customerId}>
            <ClientButton
              row={row}
              selected={row.customerId === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
