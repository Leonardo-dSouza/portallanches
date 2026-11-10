import { Eye, EyeOff } from 'lucide-react';
import type { SpecialKeyKind } from '../cash/payment-key-row';
import { InactiveTag } from './InactiveTag';
import { MoveButtons } from './MoveButtons';
import { useRowAction, type RowContext } from './use-row-action';

/** O que cada tecla especial é no caixa: a letra de antes continua valendo junto do número. */
const SPECIAL_ROWS: Record<SpecialKeyKind, { name: string; note: string }> = {
  openAccount: {
    name: 'A pagar',
    note: 'Também na tecla 0. Só no balcão: a conta fica aberta no nome e é paga no fim.',
  },
  split: {
    name: 'Dividir',
    note: 'Também na tecla D. O pedido pago em duas ou mais formas.',
  },
};

interface SpecialPaymentKeyRowProps {
  kind: SpecialKeyKind;
  number: number | null;
  active: boolean;
  context: RowContext;
  onUp: (() => Promise<void>) | null;
  onDown: (() => Promise<void>) | null;
  onToggle(): Promise<void>;
}

/**
 * A pagar ou Dividir em Cadastros → Pagamentos (2026-11-10, pedido do dono): não é forma no
 * banco, então não renomeia; sobe, desce e liga/desliga como as formas.
 *
 * @example <SpecialPaymentKeyRow kind="split" number={3} active context={context} … />
 */
export function SpecialPaymentKeyRow(props: SpecialPaymentKeyRowProps) {
  const { busy, run } = useRowAction(props.context);
  const { name, note } = SPECIAL_ROWS[props.kind];
  const runner = (action: (() => Promise<void>) | null) =>
    action && (() => void run(action));
  const toggle = props.active ? 'Desativar' : 'Ativar';
  const ToggleIcon = props.active ? EyeOff : Eye;
  return (
    <tr data-inactive={!props.active}>
      <td className="payment-key-cell">
        <kbd>{props.number ?? '—'}</kbd>
      </td>
      <td>
        {name}
        <InactiveTag active={props.active} />
        <span className="cell-sub special-key-note">{note}</span>
      </td>
      <td>
        <MoveButtons
          name={name}
          busy={busy}
          onUp={runner(props.onUp)}
          onDown={runner(props.onDown)}
        />
      </td>
      <td className="row-actions">
        <button
          type="button"
          className={`button-ghost button-sm ${props.active ? 'button-danger' : ''}`}
          aria-label={`${toggle} ${name}`}
          disabled={busy}
          aria-busy={busy}
          onClick={() => void run(props.onToggle)}
        >
          <ToggleIcon aria-hidden />
          {toggle}
        </button>
      </td>
    </tr>
  );
}
