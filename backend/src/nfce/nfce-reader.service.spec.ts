import {
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FakeNfcePageSource } from './nfce-fakes.fixture.js';
import { nfcePageHtml, SAMPLE_PAGE } from './nfce-page.fixture.js';
import { NfceReaderService } from './nfce-reader.service.js';

const KEY = '35261011222333000181650010000012341123456780';

describe('NfceReaderService', () => {
  it('lê a nota pela chave e devolve a chave junto', async () => {
    const pages = new FakeNfcePageSource().serve(
      KEY,
      nfcePageHtml(SAMPLE_PAGE),
    );
    const invoice = await new NfceReaderService(pages).read(KEY);
    expect(invoice).toMatchObject({
      accessKey: KEY,
      issuerCnpj: '11222333000181',
      amountDue: '1320.00',
    });
    expect(invoice.items).toHaveLength(3);
    expect(pages.queries).toEqual([`${KEY}|3|1`]);
  });

  it('código inválido é recusado sem consultar a SEFAZ', async () => {
    const pages = new FakeNfcePageSource();
    await expect(new NfceReaderService(pages).read('123')).rejects.toThrow(
      BadRequestException,
    );
    expect(pages.queries).toEqual([]);
  });

  it('nota cancelada chega como 422', async () => {
    const canceled = nfcePageHtml({ ...SAMPLE_PAGE, status: 'canceled' });
    const pages = new FakeNfcePageSource().serve(KEY, canceled);
    await expect(new NfceReaderService(pages).read(KEY)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('SEFAZ fora do ar chega como 503', async () => {
    const pages = new FakeNfcePageSource().failWith(
      new ServiceUnavailableException('fora'),
    );
    await expect(new NfceReaderService(pages).read(KEY)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
