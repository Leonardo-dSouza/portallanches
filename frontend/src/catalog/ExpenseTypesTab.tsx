import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import { CatalogTab } from './CatalogTab';
import { NamedEntryRow } from './NamedEntryRow';
import { NewNameForm } from './NewNameForm';
import { useCatalogList } from './use-catalog-list';

interface ExpenseTypesTabProps {
  cash: CashApi;
  admin: CatalogAdminApi;
}

export function ExpenseTypesTab({ cash, admin }: ExpenseTypesTabProps) {
  const list = useCatalogList(cash.listExpenseTypes);
  return (
    <CatalogTab
      noun="tipos de gasto"
      hint="Renomear muda o nome também nos gastos antigos. Desativar só tira o tipo da lista do caixa."
      list={list}
      labelOf={(type) => type.name}
      columns={
        <>
          <th>Tipo</th>
          <th>Situação</th>
          <th />
        </>
      }
      renderForm={(context) => (
        <NewNameForm
          title="Novo tipo de gasto"
          fieldLabel="Nome do tipo"
          submitLabel="Adicionar tipo"
          what="do tipo de gasto"
          context={context}
          create={cash.createExpenseType}
        />
      )}
      renderRow={(type, context) => (
        <NamedEntryRow
          key={type.id}
          entry={type}
          what="tipo de gasto"
          fieldLabel="Nome do tipo"
          context={context}
          save={(next) => admin.updateExpenseType(type.id, next)}
        />
      )}
    />
  );
}
