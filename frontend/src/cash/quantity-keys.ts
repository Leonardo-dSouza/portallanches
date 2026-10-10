/** "+"/"-" do bloco numérico: mexem na última linha da comanda na hora. */
export const NUMPAD_ADJUST: Record<string, 1 | -1> = {
  NumpadAdd: 1,
  NumpadSubtract: -1,
};

/** O que uma tecla no campo Qtd faz; `null` = o comportamento normal do campo. */
export type QuantityKeyAction =
  | { kind: 'toItem' }
  /** Vai para o Item já com o texto, e o Qtd fica com `quantity`. */
  | { kind: 'forward'; itemText: string; quantity: string }
  | { kind: 'adjust'; delta: 1 | -1 }
  | { kind: 'block' }
  | null;

interface QuantityKey {
  key: string;
  code: string;
  ctrlKey: boolean;
}

const DIGIT = /^\d$/;
const ARTISANAL_MARKS = ['.', ','];

/**
 * Campo Qtd antes do Item (pedido do usuário, 2026-10-10: "[Quantidade], [Item]"). Algarismos
 * ficam; Enter ou "*" passam ao Item; o que não é número (letra, "+bacon", "/obs") já começa
 * no Item; e "9." é o artesanal 9, não uma quantidade.
 *
 * @example quantityKeyAction({ key: 'c', code: 'KeyC', ctrlKey: false }, '2') // forward 'c', Qtd 2
 */
export function quantityKeyAction(
  { key, code, ctrlKey }: QuantityKey,
  quantity: string,
): QuantityKeyAction {
  if (ctrlKey) return null;
  if (key === 'Enter' || key === '*') return { kind: 'toItem' };
  const delta = NUMPAD_ADJUST[code];
  if (delta) return quantity ? { kind: 'block' } : { kind: 'adjust', delta };
  if (key.length !== 1 || DIGIT.test(key)) return null;
  if (ARTISANAL_MARKS.includes(key) && quantity)
    return { kind: 'forward', itemText: `${quantity}.`, quantity: '' };
  return { kind: 'forward', itemText: key, quantity };
}
