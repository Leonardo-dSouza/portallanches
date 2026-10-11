import type { TicketAbbreviation } from '../api/types';
import { paperNameChanges } from './abbreviation-preview';

interface PaperPreviewProps {
  menuNames: string[];
  rows: TicketAbbreviation[];
}

/** Só as linhas já com texto valem na prévia (a vazia do "Adicionar" ainda não troca nada). */
const typedRules = (rows: TicketAbbreviation[]) =>
  rows
    .filter((row) => row.from.trim() !== '')
    .map((row) => ({ from: row.from.trim(), to: row.to.trim() }));

/**
 * Prévia ao vivo, como uma tira do rolo da térmica: os nomes do cardápio que mudam no papel
 * com as abreviações digitadas (antes de salvar).
 */
export function PaperPreview({ menuNames, rows }: PaperPreviewProps) {
  const changes = paperNameChanges(menuNames, typedRules(rows));
  return (
    <section className="paper-preview" aria-label="Como sai no papel">
      <h3>Como sai no papel</h3>
      {changes.length === 0 ? (
        <p className="hint">Nenhum nome do cardápio muda.</p>
      ) : (
        <ul>
          {changes.map((change) => (
            <li key={change.before}>
              <span className="paper-preview-before">{change.before}</span>
              {' → '}
              <strong>{change.after}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
