import { useState } from 'react';
import type { FiadoDebtor } from '../api/fiado-types';
import { formatMoney } from '../api/money';
import { TextField } from '../components/TextField';
import { matchesDebtor, nextDueText, ordersCountText } from './debtor-view';

interface DebtorListProps {
  debtors: FiadoDebtor[];
  /** A noite do caixa: diz se a previsão já passou. */
  today: string;
  selectedId: number | null;
  onSelect(customerId: number): void;
}

interface DebtorButtonProps {
  debtor: FiadoDebtor;
  today: string;
  selected: boolean;
  onSelect(customerId: number): void;
}

function DebtorButton({
  debtor,
  today,
  selected,
  onSelect,
}: DebtorButtonProps) {
  const details = [
    debtor.phone,
    ordersCountText(debtor.orders.length),
    nextDueText(debtor, today),
  ].filter(Boolean);
  return (
    <button
      type="button"
      className="debtor"
      aria-pressed={selected}
      onClick={() => onSelect(debtor.customerId)}
    >
      <span className="debtor-name">{debtor.name}</span>
      <strong className="debtor-total">{formatMoney(debtor.openTotal)}</strong>
      <small>{details.join(' · ')}</small>
    </button>
  );
}

/**
 * Quem deve no fiado (2026-10-25), em ordem de nome, com a busca por nome ou telefone: o total,
 * quantos pedidos e a previsão mais próxima. Escolher abre o extrato ao lado.
 */
export function DebtorList({ debtors, ...props }: DebtorListProps) {
  const [query, setQuery] = useState('');
  const shown = debtors.filter((debtor) => matchesDebtor(debtor, query));
  return (
    <section className="card fiado-debtors" aria-label="Quem deve">
      <h2>Quem deve</h2>
      <TextField
        label="Buscar cliente"
        type="search"
        placeholder="Nome ou telefone"
        autoComplete="off"
        value={query}
        onChange={setQuery}
      />
      {debtors.length === 0 && (
        <p className="page-message">Ninguém deve no fiado.</p>
      )}
      {debtors.length > 0 && shown.length === 0 && (
        <p className="page-message">Nenhum cliente com “{query}”.</p>
      )}
      <ul className="debtor-list">
        {shown.map((debtor) => (
          <li key={debtor.customerId}>
            <DebtorButton
              debtor={debtor}
              today={props.today}
              selected={debtor.customerId === props.selectedId}
              onSelect={props.onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
