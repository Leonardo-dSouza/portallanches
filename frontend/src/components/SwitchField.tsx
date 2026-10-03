import type { LucideIcon } from 'lucide-react';

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  Icon?: LucideIcon;
}

/**
 * Interruptor em pílula (mesmo desenho dos do Cardápio), feito com checkbox nativo:
 * teclado, leitor de tela e `getByLabelText` continuam funcionando.
 *
 * @example <SwitchField label="Contar todo dia" checked={daily} onChange={setDaily} Icon={CalendarCheck} />
 */
export function SwitchField({
  label,
  checked,
  onChange,
  Icon,
}: SwitchFieldProps) {
  return (
    <label className="switch-field">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {Icon && <Icon aria-hidden />}
      {label}
      <span className="menu-switch-track" aria-hidden />
    </label>
  );
}
