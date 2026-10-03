interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
  /** Texto da opção vazia (valor ''); padrão "Selecione…". */
  emptyLabel?: string;
}

/** Lista suspensa com rótulo associado (acessível e alvo dos testes por `getByLabelText`). */
export function SelectField({
  label,
  value,
  options,
  onChange,
  emptyLabel = 'Selecione…',
}: SelectFieldProps) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
