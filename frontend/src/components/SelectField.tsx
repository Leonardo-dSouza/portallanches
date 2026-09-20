interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
}

/** Lista suspensa com rótulo associado (acessível e alvo dos testes por `getByLabelText`). */
export function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
