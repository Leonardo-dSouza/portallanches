import { Navigate, useLocation } from 'react-router-dom';

/**
 * O Histórico virou a aba Noites da Análise (2026-10-11). O endereço antigo (favoritos, links)
 * leva para lá com os mesmos filtros (`?de=&ate=&dia=`).
 *
 * @example <Route path="/historico" element={<HistoryRedirect />} />
 */
export function HistoryRedirect() {
  const { search } = useLocation();
  const filters = search.replace(/^\?/, '');
  const target = `/analise?aba=noites${filters ? `&${filters}` : ''}`;
  return <Navigate to={target} replace />;
}
