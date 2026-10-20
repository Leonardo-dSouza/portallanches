import { Inject, Injectable } from '@nestjs/common';
import { parseNfceCode } from './nfce-access-key.js';
import type { NfceInvoice } from './nfce-invoice.js';
import { parseNfcePage } from './nfce-page-parser.js';
import { NFCE_PAGE_SOURCE, type NfcePageSource } from './nfce-page-source.js';

/**
 * Lê a NFC-e de SP pelo link do QR Code ou pela chave: confere a chave (400), busca a página
 * na SEFAZ (503 se ela não responder) e lê a nota (422 se cancelada, não achada ou fora do formato).
 *
 * @example const invoice = await reader.read('https://www.nfce.fazenda.sp.gov.br/qrcode?p=…');
 */
@Injectable()
export class NfceReaderService {
  constructor(
    @Inject(NFCE_PAGE_SOURCE) private readonly pages: NfcePageSource,
  ) {}

  async read(code: string): Promise<NfceInvoice> {
    const { accessKey, queryParam } = parseNfceCode(code);
    const page = parseNfcePage(await this.pages.fetchPage(queryParam));
    return { accessKey, ...page };
  }
}
