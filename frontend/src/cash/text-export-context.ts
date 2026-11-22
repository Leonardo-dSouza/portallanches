import { createContext, useContext } from 'react';
import { browserTextExport, type TextExport } from '../stock/text-export';

/**
 * A área de transferência do pop-up do pedido (código de entrega, 2026-11-21): a do navegador,
 * ou um fake nos testes (o jsdom não tem área de transferência).
 */
export const TextExportContext = createContext<TextExport>(browserTextExport);

/** @example const textExport = useTextExport(); await textExport.copy(texto, caixa); */
export function useTextExport(): TextExport {
  return useContext(TextExportContext);
}
