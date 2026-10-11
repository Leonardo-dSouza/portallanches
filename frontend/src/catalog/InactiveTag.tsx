/**
 * Inativo só aparece com "Mostrar inativos": a marca fica ao lado do nome, sem coluna própria
 * (2026-10-11: a coluna "Situação" dizia "Ativo" em todas as linhas).
 *
 * @example <InactiveTag active={zone.active} />
 */
export function InactiveTag({ active }: { active: boolean }) {
  if (active) return null;
  return (
    <span className="tag entry-inactive" data-status="CLOSED">
      Inativo
    </span>
  );
}
