import type { CashApi } from '../api/cash-api';
import type { Closing, UserRole } from '../api/types';

/**
 * Da meia-noite até esta hora o diálogo não aparece sozinho (hotfix 2026-11-13): a noite que
 * fecha de madrugada (ou o PC que fica no Caixa virando o dia) já cai no dia seguinte, e quem
 * digitasse ali gravaria o troco da noite seguinte na hora errada.
 */
const OPENING_PROMPT_FROM_HOUR = 6;

/** Recusa de lançar antes de abrir: o formulário mostra e o diálogo volta. */
export const OPENING_REQUIRED_MESSAGE =
  'Abra o caixa antes de lançar: informe o troco inicial da gaveta.';

/**
 * Se a noite em andamento ainda espera o troco inicial (card 7). Dia escolhido no calendário
 * (`isLiveNight` falso) nunca espera: o admin corrige pelo quadro Conferência.
 *
 * @example needsDrawerOpening(true, { status: 'OPEN', openingCash: null }) // true
 */
export function needsDrawerOpening(
  isLiveNight: boolean,
  closing: Pick<Closing, 'status' | 'openingCash'>,
): boolean {
  return (
    isLiveNight && closing.status === 'OPEN' && closing.openingCash === null
  );
}

/**
 * Se o diálogo aparece sozinho ao entrar no Caixa (hotfix 2026-11-13): só no login caixa e só
 * depois das 6h. O admin que entra para consultar (estoque, cadastros) não é parado; abre pela
 * tecla do topo se quiser.
 *
 * @example promptsOpeningOnEntry('CAIXA', new Date(2026, 10, 13, 19)) // true
 */
export function promptsOpeningOnEntry(
  role: UserRole | undefined,
  now: Date,
): boolean {
  return role === 'CAIXA' && now.getHours() >= OPENING_PROMPT_FROM_HOUR;
}

/**
 * O caixa com a trava da abertura: pedido, gasto e consumo novos e o recebimento do fiado só
 * saem depois do troco inicial ("antes disso não se lança nada", card 7). `isBlocked` diz se a
 * noite ainda espera a abertura e, se sim, pede o diálogo; editar o que já existe passa direto.
 *
 * @example const gated = withOpeningGate(cash, () => needsOpening && (askOpening(), true));
 */
export function withOpeningGate(
  cash: CashApi,
  isBlocked: () => boolean,
): CashApi {
  const refuse = <T>(): Promise<T> =>
    Promise.reject(new Error(OPENING_REQUIRED_MESSAGE));
  return {
    ...cash,
    saveOrder: (id, input) =>
      id === null && isBlocked() ? refuse() : cash.saveOrder(id, input),
    saveExpense: (id, input) =>
      id === null && isBlocked() ? refuse() : cash.saveExpense(id, input),
    saveStaffConsumption: (id, input) =>
      id === null && isBlocked()
        ? refuse()
        : cash.saveStaffConsumption(id, input),
    receiveFiado: (orderId, input) =>
      isBlocked() ? refuse() : cash.receiveFiado(orderId, input),
  };
}
