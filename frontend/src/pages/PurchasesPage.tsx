import { useState } from 'react';
import { SubSections } from '../components/SubSections';
import { toDateKey } from '../history/date-keys';
import { PeriodPicker } from '../history/PeriodPicker';
import { usePeriodChoice } from '../history/use-period-choice';
import { InvoicesView } from '../purchases/InvoicesView';
import { PricesView } from '../purchases/PricesView';
import { VendorsView } from '../purchases/VendorsView';

interface PurchasesPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

/**
 * Compras (só admin, 2026-10-19): as notas fiscais lançadas como gasto no Caixa, reunidas
 * para consultar a nota de um dia sem o papel e comparar preços. Abre no mês: o preço se
 * compara entre as idas ao mercado.
 */
export function PurchasesPage({ today }: PurchasesPageProps) {
  const [now] = useState(() => today ?? new Date());
  const period = usePeriodChoice(now, null, 'month');
  return (
    <section className="purchases-page">
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Compras</h1>
        </div>
      </header>
      <PeriodPicker
        choice={period.choice}
        custom={period.custom}
        today={toDateKey(now)}
        problem={period.problem}
        onChoice={period.setChoice}
        onCustom={period.setCustom}
      />
      <SubSections
        sections={[
          {
            id: 'invoices',
            label: 'Notas',
            render: () => <InvoicesView range={period.range} />,
          },
          {
            id: 'prices',
            label: 'Preços',
            render: () => <PricesView range={period.range} />,
          },
          {
            id: 'vendors',
            label: 'Mercados',
            render: () => <VendorsView range={period.range} />,
          },
        ]}
      />
    </section>
  );
}
