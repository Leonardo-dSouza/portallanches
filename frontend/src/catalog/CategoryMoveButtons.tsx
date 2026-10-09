import { ArrowDown, ArrowUp } from 'lucide-react';

interface CategoryMoveButtonsProps {
  name: string;
  busy: boolean;
  /** Null = já está na ponta. */
  onUp: (() => void) | null;
  onDown: (() => void) | null;
}

/** Subir e descer a categoria na ordem do cardápio (a mesma do quadro e da Análise). */
export function CategoryMoveButtons(props: CategoryMoveButtonsProps) {
  const { name, busy, onUp, onDown } = props;
  return (
    <span className="category-move">
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Subir ${name}`}
        disabled={busy || onUp === null}
        onClick={onUp ?? undefined}
      >
        <ArrowUp aria-hidden />
      </button>
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Descer ${name}`}
        disabled={busy || onDown === null}
        onClick={onDown ?? undefined}
      >
        <ArrowDown aria-hidden />
      </button>
    </span>
  );
}
