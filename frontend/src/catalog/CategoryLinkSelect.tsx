import type { ProductCategory } from '../api/types';

interface CategoryLinkSelectProps {
  label: string;
  noneLabel: string;
  value: number | null;
  targets: ProductCategory[];
  busy: boolean;
  onChange(categoryId: number | null): void;
}

const NONE = '';

/**
 * Escolhe outra categoria ligada a esta (de onde vêm os adicionais, ou a escolha obrigatória),
 * ou nenhuma. Sem alvo possível, fica desligado.
 *
 * @example <CategoryLinkSelect label="Adicionais de Açaí" noneLabel="Sem adicionais" value={8} … />
 */
export function CategoryLinkSelect(props: CategoryLinkSelectProps) {
  const { label, noneLabel, value, targets, busy, onChange } = props;
  return (
    <select
      className="cell-input"
      aria-label={label}
      value={value === null ? NONE : String(value)}
      disabled={busy || targets.length === 0}
      onChange={(event) =>
        onChange(
          event.target.value === NONE ? null : Number(event.target.value),
        )
      }
    >
      <option value={NONE}>{noneLabel}</option>
      {targets.map((target) => (
        <option key={target.id} value={String(target.id)}>
          {target.name}
        </option>
      ))}
    </select>
  );
}
