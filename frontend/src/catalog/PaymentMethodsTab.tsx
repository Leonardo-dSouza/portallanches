import { Banknote, CreditCard, NotebookPen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { SettingsApi } from '../api/settings-api';
import type { PaymentMethod } from '../api/types';
import { SwitchField } from '../components/SwitchField';
import { CatalogTab } from './CatalogTab';
import { MoveButtons } from './MoveButtons';
import { NamedEntryRow } from './NamedEntryRow';
import { NewNameForm } from './NewNameForm';
import { inSortOrder } from './sort-order';
import { SpecialPaymentKeyRow } from './SpecialPaymentKeyRow';
import { useCatalogList } from './use-catalog-list';
import {
  usePaymentKeyLayout,
  type PaymentKeyLayoutState,
} from './use-payment-key-layout';
import { useRowAction, type RowContext } from './use-row-action';

interface PaymentMethodsTabProps {
  cash: CashApi;
  admin: CatalogAdminApi;
  settings: SettingsApi;
}

type MethodKind = 'plain' | 'terminal' | 'cash' | 'fiado';

interface KindInfo {
  label: string;
  Icon: LucideIcon;
  effect: string;
}

/** O que cada marca faz no caixa; a caderneta é o fiado de balcão (2026-10-25). */
const KINDS: Record<Exclude<MethodKind, 'plain'>, KindInfo> = {
  terminal: {
    label: 'Maquininha',
    Icon: CreditCard,
    effect: 'o caixa pede crédito, débito ou PIX',
  },
  cash: {
    label: 'Dinheiro',
    Icon: Banknote,
    effect: 'mostra o “Troco para” na entrega',
  },
  fiado: {
    label: 'Fiado',
    Icon: NotebookPen,
    effect: 'o caixa pede o cliente e quando ele paga',
  },
};

/** @example kindOf({ isCash: true, … }) // 'cash' */
function kindOf(method: PaymentMethod): MethodKind {
  if (method.isCardTerminal) return 'terminal';
  if (method.isCash) return 'cash';
  return method.isFiado ? 'fiado' : 'plain';
}

/** As três marcas no corpo da API: no máximo uma ligada. */
function kindFlags(kind: MethodKind) {
  return {
    isCardTerminal: kind === 'terminal',
    isCash: kind === 'cash',
    isFiado: kind === 'fiado',
  };
}

/**
 * Marca da linha: maquininha (pede o meio), dinheiro (aceita troco) ou fiado (pede o cliente).
 * Ícone com a dica no lugar da etiqueta escrita (2026-10-11: "Dinheiro [Dinheiro]" repetia o nome).
 */
function KindMark({ method }: { method: PaymentMethod }) {
  const kind = kindOf(method);
  if (kind === 'plain') return null;
  const { label, Icon, effect } = KINDS[kind];
  return (
    <span className="entry-kind" title={`${label}: ${effect}`}>
      <Icon aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Os interruptores: ligar um desliga os outros (dinheiro não é maquininha nem fiado). */
function KindSwitches({
  kind,
  onChange,
}: {
  kind: MethodKind;
  onChange(kind: MethodKind): void;
}) {
  const entries = Object.entries(KINDS) as [
    Exclude<MethodKind, 'plain'>,
    KindInfo,
  ][];
  return entries.map(([value, { label, Icon }]) => (
    <SwitchField
      key={value}
      label={label}
      checked={kind === value}
      onChange={(on) => onChange(on ? value : 'plain')}
      Icon={Icon}
    />
  ));
}

const LAST_ACTIVE_REASON =
  'Pelo menos uma forma de pagamento precisa ficar ativa, senão o caixa não consegue lançar pedidos.';

/**
 * Formas novas entram no fim da lista. A ordem é a das teclas do caixa e muda com ↑↓ (pedido
 * do usuário, 2026-10-11; antes não era editável e a lista aparecia em ordem alfabética).
 */
function nextSortOrder(methods: PaymentMethod[] | null): number {
  return Math.max(-1, ...(methods ?? []).map((m) => m.sortOrder)) + 1;
}

interface PaymentRowProps {
  method: PaymentMethod;
  all: PaymentMethod[];
  admin: CatalogAdminApi;
  context: RowContext;
  /** O número da tecla no caixa (com o A pagar e o Dividir na fileira); null na inativa. */
  keyNumber: number | null;
  onUp: (() => Promise<void>) | null;
  onDown: (() => Promise<void>) | null;
}

function PaymentRow(props: PaymentRowProps) {
  const { method, all, admin, context } = props;
  const { busy, run } = useRowAction(context);
  const activeCount = all.filter((m) => m.active).length;
  const runner = (action: (() => Promise<void>) | null) =>
    action && (() => void run(action));
  return (
    <NamedEntryRow
      entry={method}
      what="forma de pagamento"
      fieldLabel="Nome da forma"
      context={context}
      lockedReason={activeCount <= 1 ? LAST_ACTIVE_REASON : undefined}
      badge={<KindMark method={method} />}
      leadingCell={
        <td className="payment-key-cell">
          <kbd>{props.keyNumber ?? '—'}</kbd>
        </td>
      }
      orderControls={
        <MoveButtons
          name={method.name}
          busy={busy}
          onUp={runner(props.onUp)}
          onDown={runner(props.onDown)}
        />
      }
      save={(next) =>
        admin.updatePaymentMethod(method.id, {
          ...next,
          sortOrder: method.sortOrder,
          ...kindFlags(kindOf(method)),
        })
      }
    />
  );
}

interface KeyRowsProps {
  keys: PaymentKeyLayoutState;
  visible: PaymentMethod[];
  all: PaymentMethod[];
  admin: CatalogAdminApi;
  context: RowContext;
}

/**
 * As linhas na ordem da fileira do caixa: as formas visíveis e, no lugar delas, o A pagar e o
 * Dividir (2026-11-10, sempre à vista para poder religar).
 */
function PaymentKeyRows({ keys, visible, all, admin, context }: KeyRowsProps) {
  const shown = new Set(visible.map((method) => method.id));
  return (
    <tbody>
      {keys.order.map((entry, index) => {
        const moves = {
          onUp: keys.move(index, -1),
          onDown: keys.move(index, 1),
        };
        if (entry.kind !== 'method')
          return (
            <SpecialPaymentKeyRow
              key={entry.kind}
              kind={entry.kind}
              number={keys.numberOf(entry)}
              active={keys.layout[entry.kind].active}
              context={context}
              onToggle={keys.toggle(entry.kind)}
              {...moves}
            />
          );
        if (!shown.has(entry.method.id)) return null;
        return (
          <PaymentRow
            key={entry.method.id}
            method={entry.method}
            all={all}
            admin={admin}
            context={context}
            keyNumber={keys.numberOf(entry)}
            {...moves}
          />
        );
      })}
    </tbody>
  );
}

export function PaymentMethodsTab(props: PaymentMethodsTabProps) {
  const { cash, admin } = props;
  const list = useCatalogList(cash.listPaymentMethods);
  const [kind, setKind] = useState<MethodKind>('plain');
  const all = list.items ?? [];
  const keys = usePaymentKeyLayout(all, admin, props.settings);
  const create = async (name: string) => {
    await admin.createPaymentMethod({
      name,
      active: true,
      sortOrder: nextSortOrder(list.items),
      ...kindFlags(kind),
    });
    setKind('plain');
  };
  return (
    <CatalogTab
      noun="formas de pagamento"
      hint="A ordem é a das teclas do caixa (1, 2, 3…): ↑↓ mudam, também no A pagar e no Dividir (as teclas 0 e D continuam valendo). Desativar só tira a forma da lista do caixa; pedidos antigos mantêm o nome. Pelo menos uma precisa ficar ativa. Maquininha pede no caixa o meio usado (crédito, débito ou PIX); Dinheiro mostra o “Troco para” na entrega; Fiado pede o cliente e fica fora da gaveta até ele pagar."
      list={list}
      labelOf={(method) => method.name}
      order={inSortOrder}
      columns={
        <>
          <th>Tecla</th>
          <th>Forma de pagamento</th>
          <th>Ordem</th>
          <th />
        </>
      }
      newLabel="Nova forma de pagamento"
      renderForm={(context) => (
        <NewNameForm
          title="Nova forma de pagamento"
          fieldLabel="Nome da forma"
          submitLabel="Adicionar forma"
          what="da forma de pagamento"
          context={context}
          create={create}
        >
          <KindSwitches kind={kind} onChange={setKind} />
        </NewNameForm>
      )}
      renderRow={() => null}
      renderBody={(visible, context) => (
        <PaymentKeyRows
          keys={keys}
          visible={visible}
          all={all}
          admin={admin}
          context={context}
        />
      )}
    />
  );
}
