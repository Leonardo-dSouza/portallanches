import { BadRequestException } from '@nestjs/common';
import { keyFieldsOf, parseNfceCode } from './nfce-access-key.js';

// Chaves sintéticas (CNPJ de exemplo 11.222.333/0001-81), com o dígito verificador calculado à
// parte: o repositório é público e a chave real abre a nota inteira na SEFAZ.
const SP_KEY = '35261011222333000181650010000012341123456780';
const NFE_KEY = '35261011222333000181550010000012341123456787';
const RJ_KEY = '33261011222333000181650010000012341123456785';
const WRONG_DV_KEY = '35261011222333000181650010000012341123456781';
const HOST = 'https://www.nfce.fazenda.sp.gov.br';

describe('parseNfceCode', () => {
  it('aceita a chave digitada e monta a consulta da versão 3', () => {
    expect(parseNfceCode(SP_KEY)).toEqual({
      accessKey: SP_KEY,
      queryParam: `${SP_KEY}|3|1`,
    });
  });

  it('aceita a chave com espaços, como vem impressa no cupom', () => {
    const printed = SP_KEY.replace(/(\d{4})/g, '$1 ').trim();
    expect(parseNfceCode(`  ${printed} `).accessKey).toBe(SP_KEY);
  });

  it('do link v3 do QR Code tira só o parâmetro p', () => {
    const link = `${HOST}/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${SP_KEY}|3|1`;
    expect(parseNfceCode(link)).toEqual({
      accessKey: SP_KEY,
      queryParam: `${SP_KEY}|3|1`,
    });
  });

  it('do link v2 (com hash) guarda o p inteiro, que a SEFAZ também aceita', () => {
    const p = `${SP_KEY}|2|1|1|39179E5AD779438606EDE9E5A358618698580F76`;
    expect(parseNfceCode(`${HOST}/qrcode?p=${p}`)).toEqual({
      accessKey: SP_KEY,
      queryParam: p,
    });
  });

  it('aceita o link com a barra vertical codificada (%7C)', () => {
    const link = `${HOST}/qrcode?p=${SP_KEY}%7C3%7C1&outro=1`;
    expect(parseNfceCode(link).queryParam).toBe(`${SP_KEY}|3|1`);
  });

  it('recusa um p com caractere fora de dígitos, letras e barra (não vira outra URL)', () => {
    const link = `${HOST}/qrcode?p=${SP_KEY}|3|1/../../admin`;
    expect(() => parseNfceCode(link)).toThrow(BadRequestException);
  });

  it('recusa texto que não é chave nem link, dizendo o que esperava', () => {
    expect(() => parseNfceCode('nota do mercado')).toThrow(
      /recebido "nota do mercado".*44 números/,
    );
  });

  it('recusa a chave com dígito verificador errado', () => {
    expect(() => parseNfceCode(WRONG_DV_KEY)).toThrow(/dígito verificador/);
  });

  it('recusa nota de outro estado', () => {
    expect(() => parseNfceCode(RJ_KEY)).toThrow(/UF 33.*35/);
  });

  it('recusa NF-e (modelo 55), que não é o cupom do consumidor', () => {
    expect(() => parseNfceCode(NFE_KEY)).toThrow(/modelo 55.*65/);
  });
});

describe('keyFieldsOf', () => {
  it('tira o CNPJ, a série e o número da chave', () => {
    expect(keyFieldsOf('35261011222333000181650010000012341123456780')).toEqual(
      { issuerCnpj: '11222333000181', series: 1, number: 1234 },
    );
  });
});
