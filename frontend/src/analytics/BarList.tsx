import { barShare } from './analytics-format';

export interface BarRow {
  key: string | number;
  label: string;
  /** Linha fina sob o nome (categoria, noites abertas). */
  detail?: string;
  /** Só para o tamanho da barra (quantidade, reais). */
  value: number;
  /** O número que importa na linha ("12 un", "8 entregas"). */
  primary: string;
  secondary?: string;
}

interface BarListProps {
  rows: BarRow[];
  /** O que dizer quando o período não tem nada para listar. */
  empty: string;
}

/**
 * Ranking em lista numerada com uma barra fina proporcional ao maior da lista: o número
 * vem escrito, a barra só ajuda a comparar de relance.
 */
export function BarList({ rows, empty }: BarListProps) {
  if (rows.length === 0) return <p className="analytics-empty">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <ol className="bar-list">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="bar-list-name">
            {row.label}
            {row.detail && <small>{row.detail}</small>}
          </span>
          <span className="bar-list-figures">
            <strong>{row.primary}</strong>
            {row.secondary && <span>{row.secondary}</span>}
          </span>
          <span className="bar-list-track" aria-hidden>
            <span style={{ width: barShare(row.value, max) }} />
          </span>
        </li>
      ))}
    </ol>
  );
}
