import { useState } from 'react';
import type { ImportApi, ImportKind, ImportResult } from '../api/import-api';
import type { FileReaderFn } from './file-base64';

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Falha ao importar a planilha';

/** Envio à API com estado de carregando, resultado e erro. */
function useImportRequest(imports: ImportApi, readFile: FileReaderFn) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (kind: ImportKind, file: File, apply: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await imports.runImport(kind, await readFile(file), apply));
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };
  const clear = () => {
    setResult(null);
    setError(null);
  };
  return { result, busy, error, send, clear };
}

/**
 * Estado da aba de importação: qual planilha, qual arquivo, simular e gravar. Trocar a
 * planilha ou o arquivo descarta a simulação anterior (gravar sempre o que foi simulado).
 *
 * @example const flow = useSpreadsheetImport(createImportApi(api), readFileAsBase64);
 */
export function useSpreadsheetImport(
  imports: ImportApi,
  readFile: FileReaderFn,
) {
  const [kind, setKind] = useState<ImportKind>('cardapio');
  const [file, setFile] = useState<File | null>(null);
  const request = useImportRequest(imports, readFile);
  return {
    ...request,
    kind,
    file,
    chooseKind: (next: ImportKind) => {
      setKind(next);
      request.clear();
    },
    chooseFile: (next: File | null) => {
      setFile(next);
      request.clear();
    },
    simulate: () => file && request.send(kind, file, false),
    apply: () => file && request.send(kind, file, true),
  };
}
