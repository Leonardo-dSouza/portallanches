import { cleanPinDigits } from '../catalog/manager-pin-values';
import type { ManagerCancelState } from './use-manager-cancel';

interface ReasonFieldProps {
  state: ManagerCancelState;
  /** Um clique preenche o motivo (o texto continua editável). */
  quickReasons: readonly string[];
  /** Nome do campo para o leitor de tela ("Motivo do cancelamento"). */
  label: string;
}

/**
 * O motivo de desfazer (cancelar o pedido, estornar o recebimento): teclas dos motivos comuns e
 * o campo livre, que recebe o foco ao abrir a janela.
 *
 * @example <ReasonField state={state} quickReasons={['Lançado errado']} label="Motivo do estorno" />
 */
export function ReasonField({ state, quickReasons, label }: ReasonFieldProps) {
  return (
    <fieldset className="cancel-reason">
      <legend>Motivo</legend>
      <div className="cancel-reason-quick">
        {quickReasons.map((quick) => (
          <button
            key={quick}
            type="button"
            className="toggle-key toggle-key-sm"
            aria-pressed={state.reason === quick}
            onClick={() => state.setReason(quick)}
          >
            {quick}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="sr-only">{label}</span>
        <input
          // O `Dialog` foca o motivo ao abrir.
          data-autofocus
          maxLength={200}
          placeholder="Ou escreva o motivo"
          value={state.reason}
          onChange={(event) => state.setReason(event.target.value)}
        />
      </label>
    </fieldset>
  );
}

/**
 * O código do gerente (era a senha do admin até 2026-11-15), só quando a trava do caixa vale (ou a
 * API pediu), com o porquê em cima. Só aceita dígitos.
 *
 * @example <ManagerField state={state} lockHint="O recebimento passou do tempo da trava…" />
 */
export function ManagerField({
  state,
  lockHint,
}: {
  state: ManagerCancelState;
  lockHint: string;
}) {
  if (!state.askPassword) return null;
  return (
    <>
      <p className="hint">{lockHint}</p>
      <label className="field">
        Código do gerente (6 números)
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={state.password}
          onChange={(event) =>
            state.setPassword(cleanPinDigits(event.target.value))
          }
        />
      </label>
    </>
  );
}
