interface MenuSuppliesToggleProps {
  /** true = Baixa na venda; false = Todos. */
  value: boolean;
  onChange(value: boolean): void;
}

interface FilterKeyProps {
  label: string;
  pressed: boolean;
  onClick(): void;
}

function FilterKey({ label, pressed, onClick }: FilterKeyProps) {
  return (
    <button
      type="button"
      className="toggle-key"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/**
 * Duas teclas lado a lado: "Baixa na venda" e "Todos" (com aria-pressed).
 *
 * @example <MenuSuppliesToggle value={true} onChange={setMenuOnly} />
 */
export function MenuSuppliesToggle({
  value,
  onChange,
}: MenuSuppliesToggleProps) {
  return (
    <div
      className="stock-filter-keys flex shrink-0 items-center gap-1.5"
      role="group"
      aria-label="Filtro de insumos"
    >
      <FilterKey
        label="Baixa na venda"
        pressed={value}
        onClick={() => onChange(true)}
      />
      <FilterKey
        label="Todos"
        pressed={!value}
        onClick={() => onChange(false)}
      />
    </div>
  );
}
