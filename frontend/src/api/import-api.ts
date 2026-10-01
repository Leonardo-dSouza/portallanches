import type { ApiClient } from './api-client';

/** Planilhas que a tela do admin importa (a histórica `ticket-medio` segue só pela linha de comando). */
export type ImportKind = 'cardapio' | 'bebidas';

export interface ImportIssue {
  severity: 'error' | 'warning';
  /** Célula ou linha da planilha (`Plan1!E4`) ou o item (`insumo "Ovo"`). */
  where: string;
  message: string;
}

export interface ImportResult {
  /** `dry-run` = simulação sem erros; `blocked` = tem erro, nada pode ser gravado. */
  outcome: 'dry-run' | 'applied' | 'blocked';
  issues: ImportIssue[];
  /** Uma linha por mudança: `+ ` novo, `~ ` alterado, `- ` desativado. */
  changes: string[];
  summary: {
    supplies: number;
    products: { category: string; count: number }[];
  };
}

export interface ImportApi {
  /** Sem `apply` só simula; com `apply` grava (tudo ou nada). */
  runImport(
    kind: ImportKind,
    fileBase64: string,
    apply: boolean,
  ): Promise<ImportResult>;
}

/** @example await createImportApi(api).runImport('bebidas', base64, false) */
export function createImportApi(api: ApiClient): ImportApi {
  return {
    runImport: (kind, fileBase64, apply) =>
      api.request('POST', `/imports/${kind}`, { file: fileBase64, apply }),
  };
}
