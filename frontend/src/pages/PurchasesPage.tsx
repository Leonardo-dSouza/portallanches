import { Receipt, Store, Tags } from 'lucide-react';
import { useState } from 'react';
import { SubSections } from '../components/SubSections';
import { InvoicesView } from '../purchases/InvoicesView';
import { PricesView } from '../purchases/PricesView';
import { purchasesRange } from '../purchases/purchases-range';
import { VendorsView } from '../purchases/VendorsView';

interface PurchasesPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

/**
 * Compras (só admin, 2026-10-19): as notas fiscais lançadas como gasto no Caixa, reunidas
 * para consultar a nota de um dia sem o papel e comparar preços. Abria no mês com os atalhos
 * de período; desde 2026-11-14 (pedido do usuário: o dono não clica nesses filtros) abre com
 * todas as notas dos últimos 12 meses, e a nota se acha pela busca (mercado ou data).
 */
export function PurchasesPage({ today }: PurchasesPageProps) {
  const [range] = useState(() => purchasesRange(today ?? new Date()));
  return (
    <section className="purchases-page">
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Compras</h1>
          <p className="hint mt-1">Notas dos últimos 12 meses.</p>
        </div>
      </header>
      <SubSections
        variant="big"
        sections={[
          {
            id: 'invoices',
            label: 'Notas',
            icon: Receipt,
            render: () => <InvoicesView range={range} />,
          },
          {
            id: 'prices',
            label: 'Preços',
            icon: Tags,
            render: () => <PricesView range={range} />,
          },
          {
            id: 'vendors',
            label: 'Mercados',
            icon: Store,
            render: () => <VendorsView range={range} />,
          },
        ]}
      />
    </section>
  );
}
