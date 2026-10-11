import { SlidersHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDismiss } from '../calendar/use-dismiss';
import { SwitchRow, type SwitchOption } from '../components/SwitchRow';

interface BlockPickerProps<K extends string> {
  options: readonly SwitchOption<K>[];
  isOn(key: K): boolean;
  onToggle(key: K): void;
}

/**
 * Os blocos da Análise atrás de um botão (2026-10-11: as pílulas do "Mostrar" ocupavam duas
 * fileiras acima dos números). Esc ou clicar fora fecham.
 *
 * @example <BlockPicker options={blocks} isOn={(id) => shown.has(id)} onToggle={toggle} />
 */
export function BlockPicker<K extends string>(props: BlockPickerProps<K>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, () => setOpen(false));
  return (
    <div className="block-picker" ref={containerRef}>
      <button
        type="button"
        className="button button-secondary button-sm"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal aria-hidden />
        Personalizar blocos
      </button>
      {open && (
        <div className="block-picker-panel">
          <SwitchRow
            label="Mostrar"
            options={props.options}
            isOn={props.isOn}
            onToggle={props.onToggle}
          />
        </div>
      )}
    </div>
  );
}
