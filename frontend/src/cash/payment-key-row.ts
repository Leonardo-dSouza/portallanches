import type { PaymentKeyLayout, PaymentMethod } from '../api/types';
import { inSortOrder } from '../catalog/sort-order';

// A fileira das teclas de pagamento (2026-11-10, pedido do dono): as formas na ordem do cadastro
// com o A pagar e o Dividir no lugar escolhido em Cadastros → Pagamentos. O número de cada tecla
// é fixo pela posição entre as ligadas, igual no balcão e na entrega (onde o A pagar não existe,
// o número dele fica vago); as letras 0 e D continuam valendo.

export type SpecialKeyKind = keyof PaymentKeyLayout;

export type PaymentKeyEntry =
  { kind: 'method'; method: PaymentMethod } | { kind: SpecialKeyKind };

export type NumberedPaymentKey = PaymentKeyEntry & { number: number };

const SPECIAL_KINDS: readonly SpecialKeyKind[] = ['openAccount', 'split'];

/**
 * Todas as teclas na ordem da fileira, inativas e desligadas também (a lista de Cadastros).
 *
 * @example paymentKeyOrder(methods, layout).map((e) => e.kind) // ['method', 'split', 'method', 'openAccount']
 */
export function paymentKeyOrder(
  methods: readonly PaymentMethod[],
  layout: PaymentKeyLayout,
): PaymentKeyEntry[] {
  const row: PaymentKeyEntry[] = inSortOrder(methods).map((method) => ({
    kind: 'method',
    method,
  }));
  const specials = [...SPECIAL_KINDS].sort(
    (a, b) => layout[a].position - layout[b].position,
  );
  for (const kind of specials)
    row.splice(Math.min(layout[kind].position, row.length), 0, { kind });
  return row;
}

function isShown(entry: PaymentKeyEntry, layout: PaymentKeyLayout): boolean {
  return entry.kind === 'method'
    ? entry.method.active
    : layout[entry.kind].active;
}

/**
 * As teclas do caixa: só as ativas e ligadas, cada uma com o número fixo da posição.
 *
 * @example numberedPaymentKeys(methods, layout)[2] // { kind: 'split', number: 3 }
 */
export function numberedPaymentKeys(
  methods: readonly PaymentMethod[],
  layout: PaymentKeyLayout,
): NumberedPaymentKey[] {
  return paymentKeyOrder(methods, layout)
    .filter((entry) => isShown(entry, layout))
    .map((entry, index) => ({ ...entry, number: index + 1 }));
}

/**
 * Troca a tecla da posição `index` com a vizinha (`-1` sobe, `1` desce); null na ponta.
 *
 * @example moveKeyEntry(order, 5, -1) // o Dividir sobe uma posição
 */
export function moveKeyEntry(
  order: readonly PaymentKeyEntry[],
  index: number,
  direction: -1 | 1,
): PaymentKeyEntry[] | null {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return null;
  const moved = [...order];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

/**
 * O que gravar depois de mover: os ids das formas na ordem nova (`PUT /payment-methods/order`)
 * e a posição das especiais (`PUT /settings`), mantendo o liga/desliga de `current`.
 *
 * @example layoutFromKeyOrder(moved, current).layout.split.position // 4
 */
export function layoutFromKeyOrder(
  order: readonly PaymentKeyEntry[],
  current: PaymentKeyLayout,
): { ids: number[]; layout: PaymentKeyLayout } {
  const ids = order.flatMap((e) => (e.kind === 'method' ? [e.method.id] : []));
  const positionOf = (kind: SpecialKeyKind) =>
    order.findIndex((e) => e.kind === kind);
  return {
    ids,
    layout: {
      openAccount: {
        ...current.openAccount,
        position: positionOf('openAccount'),
      },
      split: { ...current.split, position: positionOf('split') },
    },
  };
}
