import { Banknote, CreditCard } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { PaymentMethod } from '../api/types';
import { SwitchField } from '../components/SwitchField';
import { CatalogTab } from './CatalogTab';
import { MoveButtons } from './MoveButtons';
import { NamedEntryRow } from './NamedEntryRow';
import { NewNameForm } from './NewNameForm';
import { inSortOrder, moveInSortOrder } from './sort-order';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

interface PaymentMethodsTabProps {
  cash: CashApi;
  admin: CatalogAdminApi;
}

const TERMINAL_LABEL = 'Maquininha';
const CASH_LABEL = 'Dinheiro';

/**
 * Marca da linha: maquininha (pede o meio) ou dinheiro (aceita troco). Ícone com a dica no
 * lugar da etiqueta escrita (2026-10-11: "Dinheiro [Dinheiro]" repetia o nome).
 */
function KindMark({ method }: { method: PaymentMethod }) {
  if (!method.isCardTerminal && !method.isCash) return null;
  const terminal = method.isCardTerminal;
  const Icon = terminal ? CreditCard : Banknote;
  const label = terminal ? TERMINAL_LABEL : CASH_LABEL;
  const effect = terminal
    ? 'o caixa pede crédito, débito ou PIX'
    : 'mostra o “Troco para” na entrega';
  return (
    <span className="entry-kind" title={`${label}: ${effect}`}>
      <Icon aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

type MethodKind = 'plain' | 'terminal' | 'cash';

/** Os dois interruptores: ligar um desliga o outro (dinheiro não é maquininha). */
function KindSwitches({
  kind,
  onChange,
}: {
  kind: MethodKind;
  onChange(kind: MethodKind): void;
}) {
  return (
    <>
      <SwitchField
        label={TERMINAL_LABEL}
        checked={kind === 'terminal'}
        onChange={(on) => onChange(on ? 'terminal' : 'plain')}
        Icon={CreditCard}
      />
      <SwitchField
        label={CASH_LABEL}
        checked={kind === 'cash'}
        onChange={(on) => onChange(on ? 'cash' : 'plain')}
        Icon={Banknote}
      />
    </>
  );
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

/** A tecla do caixa: posição entre as ativas, na ordem; a inativa não tem. */
function keyOf(method: PaymentMethod, all: PaymentMethod[]): string {
  if (!method.active) return '—';
  const active = inSortOrder(all).filter((m) => m.active);
  return String(active.findIndex((m) => m.id === method.id) + 1);
}

interface PaymentRowProps {
  method: PaymentMethod;
  all: PaymentMethod[];
  admin: CatalogAdminApi;
  context: RowContext;
}

function PaymentRow({ method, all, admin, context }: PaymentRowProps) {
  const { busy, run } = useRowAction(context);
  const activeCount = all.filter((m) => m.active).length;
  const move = (direction: -1 | 1) => {
    const ids = moveInSortOrder(all, method.id, direction);
    if (!ids) return null;
    return () => void run(() => admin.reorderPaymentMethods(ids));
  };
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
          <kbd>{keyOf(method, all)}</kbd>
        </td>
      }
      orderControls={
        <MoveButtons
          name={method.name}
          busy={busy}
          onUp={move(-1)}
          onDown={move(1)}
        />
      }
      save={(next) =>
        admin.updatePaymentMethod(method.id, {
          ...next,
          sortOrder: method.sortOrder,
          isCardTerminal: method.isCardTerminal,
          isCash: method.isCash,
        })
      }
    />
  );
}

export function PaymentMethodsTab({ cash, admin }: PaymentMethodsTabProps) {
  const list = useCatalogList(cash.listPaymentMethods);
  const [kind, setKind] = useState<MethodKind>('plain');
  const all = list.items ?? [];
  const create = async (name: string) => {
    await admin.createPaymentMethod({
      name,
      active: true,
      sortOrder: nextSortOrder(list.items),
      isCardTerminal: kind === 'terminal',
      isCash: kind === 'cash',
    });
    setKind('plain');
  };
  return (
    <CatalogTab
      noun="formas de pagamento"
      hint="A ordem é a das teclas do caixa (1, 2, 3…): ↑↓ mudam. Desativar só tira a forma da lista do caixa; pedidos antigos mantêm o nome. Pelo menos uma precisa ficar ativa. Maquininha pede no caixa o meio usado (crédito, débito ou PIX); Dinheiro mostra o “Troco para” na entrega."
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
      renderRow={(method, context) => (
        <PaymentRow
          key={method.id}
          method={method}
          all={all}
          admin={admin}
          context={context}
        />
      )}
    />
  );
}
