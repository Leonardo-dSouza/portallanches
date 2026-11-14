import type { ApiClient } from './api-client';
import type {
  ApplyCostResult,
  CostChanges,
  CostHistoryRow,
  CostPreview,
  CostSheetView,
} from './cost-types';

/** Operações da tela de custos: leitura da planilha, prévia, gravação e histórico. */
export interface CostApi {
  sheet(): Promise<CostSheetView>;
  preview(changes: CostChanges): Promise<CostPreview>;
  apply(
    changes: CostChanges,
    basedOnChangeSetId: number | null,
  ): Promise<ApplyCostResult>;
  history(supplyId: number): Promise<CostHistoryRow[]>;
}

/**
 * Cria o cliente de custos sobre a instância de `ApiClient`.
 *
 * @example const costApi = createCostApi(api); const sheet = await costApi.sheet();
 */
export function createCostApi(api: ApiClient): CostApi {
  return {
    sheet: () => api.request<CostSheetView>('GET', '/costs'),
    preview: (changes) =>
      api.request<CostPreview>('POST', '/costs/preview', { changes }),
    apply: (changes, basedOnChangeSetId) =>
      api.request<ApplyCostResult>('POST', '/costs/apply', {
        changes,
        basedOnChangeSetId,
      }),
    history: (supplyId) =>
      api.request<CostHistoryRow[]>(
        'GET',
        `/costs/history?supplyId=${supplyId}`,
      ),
  };
}
