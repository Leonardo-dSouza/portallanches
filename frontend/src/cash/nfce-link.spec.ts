import { sefazLinkOf } from './nfce-link';

const KEY = '35261011222333000181650010000012341123456780';
const QUERY =
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';

describe('sefazLinkOf', () => {
  it('monta a consulta pela chave, com ou sem espaços', () => {
    expect(sefazLinkOf(KEY)).toBe(`${QUERY}?p=${KEY}|3|1`);
    expect(sefazLinkOf(` ${KEY.slice(0, 4)} ${KEY.slice(4)} `)).toBe(
      `${QUERY}?p=${KEY}|3|1`,
    );
  });

  it('do link do QR Code usa só o p, sempre no host da SEFAZ', () => {
    expect(sefazLinkOf(`https://outro.site/qrcode?p=${KEY}%7C2%7C1&x=1`)).toBe(
      `${QUERY}?p=${KEY}|2|1`,
    );
  });

  it.each(['', 'abc', '123', `${KEY}9`, `https://x/?p=${KEY}|<script>`])(
    'sem chave válida não há link: %j',
    (typed) => {
      expect(sefazLinkOf(typed)).toBeNull();
    },
  );
});
