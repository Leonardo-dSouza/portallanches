import { useState } from 'react';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { SettingsApi } from '../api/settings-api';
import type { PaymentKeyLayout, PaymentMethod } from '../api/types';
import {
  layoutFromKeyOrder,
  moveKeyEntry,
  numberedPaymentKeys,
  paymentKeyOrder,
  type PaymentKeyEntry,
  type SpecialKeyKind,
} from '../cash/payment-key-row';
import {
  useAppSettings,
  useMergeAppSettings,
} from '../settings/app-settings-context';

/** A fileira de Cadastros → Pagamentos: formas e as teclas A pagar e Dividir (2026-11-10). */
export interface PaymentKeyLayoutState {
  layout: PaymentKeyLayout;
  order: PaymentKeyEntry[];
  /** O número da tecla no caixa; null na desligada ou inativa. */
  numberOf(entry: PaymentKeyEntry): number | null;
  /** Gravação de subir/descer a tecla da posição `index`; null na ponta. */
  move(index: number, direction: -1 | 1): (() => Promise<void>) | null;
  toggle(kind: SpecialKeyKind): () => Promise<void>;
}

const entryKey = (entry: PaymentKeyEntry): string =>
  entry.kind === 'method' ? `m${entry.method.id}` : entry.kind;

const methodIds = (order: readonly PaymentKeyEntry[]): string =>
  order.flatMap((e) => (e.kind === 'method' ? [e.method.id] : [])).join();

const samePositions = (a: PaymentKeyLayout, b: PaymentKeyLayout): boolean =>
  a.openAccount.position === b.openAccount.position &&
  a.split.position === b.split.position;

/**
 * Lê o lugar das teclas especiais do contexto e grava: a ordem das formas no
 * `PUT /payment-methods/order` e o lugar/liga-desliga no `PUT /settings` (só o que mudou).
 *
 * @example const keys = usePaymentKeyLayout(all, admin, settings); keys.move(0, 1)?.();
 */
export function usePaymentKeyLayout(
  all: PaymentMethod[],
  admin: CatalogAdminApi,
  settings: SettingsApi,
): PaymentKeyLayoutState {
  const merge = useMergeAppSettings();
  const [layout, setLayout] = useState(useAppSettings().paymentKeyLayout);
  const order = paymentKeyOrder(all, layout);
  const numbers = new Map(
    numberedPaymentKeys(all, layout).map((key) => [entryKey(key), key.number]),
  );
  const saveLayout = async (paymentKeyLayout: PaymentKeyLayout) => {
    const saved = await settings.saveSettings({ paymentKeyLayout });
    setLayout(saved.paymentKeyLayout);
    merge({ paymentKeyLayout: saved.paymentKeyLayout });
  };
  const move = (index: number, direction: -1 | 1) => {
    const moved = moveKeyEntry(order, index, direction);
    if (!moved) return null;
    const next = layoutFromKeyOrder(moved, layout);
    const before = layoutFromKeyOrder(order, layout);
    return async () => {
      if (methodIds(moved) !== methodIds(order))
        await admin.reorderPaymentMethods(next.ids);
      if (!samePositions(next.layout, before.layout))
        await saveLayout(next.layout);
    };
  };
  const toggle = (kind: SpecialKeyKind) => () =>
    saveLayout({
      ...layout,
      [kind]: { ...layout[kind], active: !layout[kind].active },
    });
  return {
    layout,
    order,
    numberOf: (entry) => numbers.get(entryKey(entry)) ?? null,
    move,
    toggle,
  };
}
