import type { DiningOption } from '../api/types';

/**
 * Etiqueta COMER ou VIAGEM do balcão (2026-11-08: COMER em destaque como exceção).
 *
 * @example <DiningTag option="EAT_IN" />
 */
export function DiningTag({ option }: { option: DiningOption | null }) {
  if (!option) return null;
  return (
    <span className="tag" data-dining={option}>
      {option === 'EAT_IN' ? 'COMER' : 'VIAGEM'}
    </span>
  );
}
