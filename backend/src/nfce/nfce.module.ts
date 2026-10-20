import { Module } from '@nestjs/common';
import {
  HttpNfcePageSource,
  NFCE_FETCH,
  NFCE_LOG,
  type NfceFetch,
  type NfceLog,
} from './http-nfce-page-source.js';
import { NFCE_PAGE_SOURCE } from './nfce-page-source.js';
import { NfceReaderService } from './nfce-reader.service.js';

const nodeFetch: NfceFetch = (url, init) => fetch(url, init);
const jsonLog: NfceLog = (entry) => console.warn(JSON.stringify(entry));

/** Leitura da NFC-e na consulta pública da SEFAZ-SP. */
@Module({
  providers: [
    NfceReaderService,
    { provide: NFCE_PAGE_SOURCE, useClass: HttpNfcePageSource },
    { provide: NFCE_FETCH, useValue: nodeFetch },
    { provide: NFCE_LOG, useValue: jsonLog },
  ],
  exports: [NfceReaderService],
})
export class NfceModule {}
