import type { ComponentPropsWithRef } from 'react';

interface TextFieldProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'onChange'
> {
  label: string;
  value: string;
  onChange(value: string): void;
}

/** Campo com rótulo associado ao input (acessível e alvo dos testes por `getByLabelText`). */
export function TextField({ label, onChange, ...inputProps }: TextFieldProps) {
  return (
    <label className="field">
      {label}
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
