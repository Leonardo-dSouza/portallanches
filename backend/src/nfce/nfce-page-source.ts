export const NFCE_PAGE_SOURCE = Symbol('NFCE_PAGE_SOURCE');

/** De onde vem a página da consulta da NFC-e (a SEFAZ-SP na produção, um fake nos testes). */
export interface NfcePageSource {
  /** HTML da consulta para o `p` já validado (`<chave>|3|1` ou o `p` do QR Code). */
  fetchPage(queryParam: string): Promise<string>;
}
