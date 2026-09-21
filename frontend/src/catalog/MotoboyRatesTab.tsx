import { useMemo } from 'react';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import { Skeleton } from '../components/Skeleton';
import { LoadFailure } from './LoadFailure';
import { NewRateForm } from './NewRateForm';
import { RateGroupCard } from './RateGroupCard';
import { currentRate, ratesOfGroup } from './rates-view';
import { useCatalogList } from './use-catalog-list';
import type { RowContext } from './use-row-action';
import { useState } from 'react';

interface MotoboyRatesTabProps {
  admin: CatalogAdminApi;
  /** Hoje (`AAAA-MM-DD`), para saber qual diária está em vigor. */
  today: string;
}

const GROUPS = [
  { id: 'TUE_THU', label: 'Terça a quinta', note: undefined },
  {
    id: 'FRI_SUN',
    label: 'Sexta a domingo',
    note: 'Inclui a segunda-feira, se a lanchonete abrir.',
  },
] as const;

/** Diária do motoboy por grupo de dias, com histórico. Só mostra e cria; linhas antigas não se editam. */
export function MotoboyRatesTab({ admin, today }: MotoboyRatesTabProps) {
  const load = useMemo(() => () => admin.listMotoboyRates(), [admin]);
  const list = useCatalogList(load);
  const [error, setError] = useState<string | null>(null);
  if (list.error)
    return <LoadFailure message={list.error} onRetry={list.reload} />;
  if (!list.items) return <Skeleton label="Carregando diárias…" rows={4} />;
  const rates = list.items;
  const context: RowContext = {
    onSaved: () => {
      setError(null);
      list.reload();
    },
    onError: setError,
  };
  return (
    <div className="catalog-tab">
      <NewRateForm admin={admin} context={context} today={today} />
      <p className="hint">
        A nova diária vale para os dias que ainda não têm lançamentos. Dias já
        abertos ou fechados mantêm a diária com que nasceram. Repetir o mesmo
        grupo e a mesma data corrige o valor daquela linha.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="rate-groups">
        {GROUPS.map((group) => (
          <RateGroupCard
            key={group.id}
            label={group.label}
            note={group.note}
            history={ratesOfGroup(rates, group.id)}
            current={currentRate(rates, group.id, today)}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}
