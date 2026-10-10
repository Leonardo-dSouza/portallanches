import { Banknote, CreditCard } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { PaymentMethod } from '../api/types';
import { SwitchField } from '../components/SwitchField';
import { CatalogTab } from './CatalogTab';
import { NamedEntryRow } from './NamedEntryRow';
import { NewNameForm } from './NewNameForm';
import { useCatalogList } from './use-catalog-list';

interface PaymentMethodsTabProps {
  cash: CashApi;
  admin: CatalogAdminApi;
}

const TERMINAL_LABEL = 'Maquininha';
const CASH_LABEL = 'Dinheiro';

/** Etiqueta da linha: maquininha (pede o meio) ou dinheiro (aceita troco). */
function kindBadge(method: PaymentMethod): string | undefined {
  if (method.isCardTerminal) return TERMINAL_LABEL;
  return method.isCash ? CASH_LABEL : undefined;
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

/** Formas novas entram no fim da lista; a ordem de exibição não é editável (decisão do usuário). */
function nextSortOrder(methods: PaymentMethod[] | null): number {
  return Math.max(-1, ...(methods ?? []).map((m) => m.sortOrder)) + 1;
}

export function PaymentMethodsTab({ cash, admin }: PaymentMethodsTabProps) {
  const list = useCatalogList(cash.listPaymentMethods);
  const [kind, setKind] = useState<MethodKind>('plain');
  const activeCount = (list.items ?? []).filter((m) => m.active).length;
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
      hint="Desativar só tira a forma da lista do caixa; pedidos antigos mantêm o nome. Pelo menos uma precisa ficar ativa. Maquininha pede no caixa o meio usado (crédito, débito ou PIX); Dinheiro mostra o “Troco para” na entrega."
      list={list}
      labelOf={(method) => method.name}
      columns={
        <>
          <th>Forma de pagamento</th>
          <th>Situação</th>
          <th />
        </>
      }
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
        <NamedEntryRow
          key={method.id}
          entry={method}
          what="forma de pagamento"
          fieldLabel="Nome da forma"
          context={context}
          lockedReason={activeCount <= 1 ? LAST_ACTIVE_REASON : undefined}
          badge={kindBadge(method)}
          save={(next) =>
            admin.updatePaymentMethod(method.id, {
              ...next,
              sortOrder: method.sortOrder,
              isCardTerminal: method.isCardTerminal,
              isCash: method.isCash,
            })
          }
        />
      )}
    />
  );
}
