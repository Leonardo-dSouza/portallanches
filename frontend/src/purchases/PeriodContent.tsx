import type { ReactNode } from 'react';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import type { RangeDataState } from '../history/use-range-data';

interface PeriodContentProps<T> {
  state: RangeDataState<T>;
  /** O que carrega, para o leitor de tela ("Carregando as notas…"). */
  loadingLabel: string;
  children(data: T): ReactNode;
}

/** Carregando, falha com "Tentar de novo" ou os dados do período, nas abas de Compras. */
export function PeriodContent<T>({
  state,
  loadingLabel,
  children,
}: PeriodContentProps<T>) {
  if (state.loading) return <Skeleton label={loadingLabel} rows={5} />;
  if (state.error)
    return <LoadFailure message={state.error} onRetry={state.reload} />;
  return state.data === null ? null : children(state.data);
}
