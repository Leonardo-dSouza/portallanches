import type { LucideIcon } from 'lucide-react';

export interface SwitchOption<K extends string> {
  key: K;
  label: string;
  Icon: LucideIcon;
}

interface SwitchRowProps<K extends string> {
  /** Nome do grupo ("Mostrar"), lido também pelo leitor de tela. */
  label: string;
  options: readonly SwitchOption<K>[];
  isOn(key: K): boolean;
  onToggle(key: K): void;
}

/**
 * Fileira de interruptores em pílula (vários ligados ao mesmo tempo), como o "Mostrar" do
 * Cardápio e a escolha de blocos da Análise.
 *
 * @example <SwitchRow label="Mostrar" options={OPTIONS} isOn={(k) => shown.has(k)} onToggle={toggle} />
 */
export function SwitchRow<K extends string>(props: SwitchRowProps<K>) {
  return (
    <div className="menu-view-options" role="group" aria-label={props.label}>
      <span className="menu-view-label" aria-hidden>
        {props.label}
      </span>
      {props.options.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="switch"
          aria-checked={props.isOn(key)}
          className="menu-switch"
          onClick={() => props.onToggle(key)}
        >
          <Icon aria-hidden />
          {label}
          <span className="menu-switch-track" aria-hidden />
        </button>
      ))}
    </div>
  );
}
