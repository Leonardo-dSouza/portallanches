import { CreditCard } from 'lucide-react';
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

const LAST_ACTIVE_REASON =
  'Pelo menos uma forma de pagamento precisa ficar ativa, senão o caixa não consegue lançar pedidos.';

/** Formas novas entram no fim da lista; a ordem de exibição não é editável (decisão do usuário). */
function nextSortOrder(methods: PaymentMethod[] | null): number {
  return Math.max(-1, ...(methods ?? []).map((m) => m.sortOrder)) + 1;
}

export function PaymentMethodsTab({ cash, admin }: PaymentMethodsTabProps) {
  const list = useCatalogList(cash.listPaymentMethods);
  const [isCardTerminal, setCardTerminal] = useState(false);
  const activeCount = (list.items ?? []).filter((m) => m.active).length;
  const create = async (name: string) => {
    await admin.createPaymentMethod({
      name,
      active: true,
      sortOrder: nextSortOrder(list.items),
      isCardTerminal,
    });
    setCardTerminal(false);
  };
  return (
    <CatalogTab
      noun="formas de pagamento"
      hint="Desativar só tira a forma da lista do caixa; pedidos antigos mantêm o nome. Pelo menos uma precisa ficar ativa. Maquininha pede no caixa o meio usado (crédito, débito ou PIX)."
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
          <SwitchField
            label={TERMINAL_LABEL}
            checked={isCardTerminal}
            onChange={setCardTerminal}
            Icon={CreditCard}
          />
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
          badge={method.isCardTerminal ? 'Maquininha' : undefined}
          save={(next) =>
            admin.updatePaymentMethod(method.id, {
              ...next,
              sortOrder: method.sortOrder,
              isCardTerminal: method.isCardTerminal,
            })
          }
        />
      )}
    />
  );
}
