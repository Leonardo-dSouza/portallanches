import { BadRequestException } from '@nestjs/common';
import { parseCustomerInput, parsePhone } from './customer-input.js';

const VALID = {
  name: ' Ana ',
  phone: '(79) 99999-1234',
  street: 'Rua A',
  number: ' 123 ',
  reference: ' casa azul ',
  deliveryZoneId: 3,
};

describe('parsePhone', () => {
  it('guarda só os dígitos', () => {
    expect(parsePhone('(79) 99999-1234')).toBe('79999991234');
    expect(parsePhone('9999-1234')).toBe('99991234');
  });

  it('ausente ou vazio vira cliente sem telefone', () => {
    expect(parsePhone(undefined)).toBeNull();
    expect(parsePhone(null)).toBeNull();
    expect(parsePhone('')).toBeNull();
  });

  it.each(['123', '12345678901234', 79999991234, 'abc'])(
    'rejeita %j com a mensagem do formato esperado',
    (raw) => {
      expect(() => parsePhone(raw)).toThrow(/8 a 13 dígitos/);
    },
  );
});

describe('parseCustomerInput', () => {
  it('apara textos e normaliza o telefone', () => {
    expect(parseCustomerInput(VALID)).toEqual({
      name: 'Ana',
      phone: '79999991234',
      street: 'Rua A',
      number: '123',
      reference: 'casa azul',
      deliveryZoneId: 3,
    });
  });

  it.each(['s/n', 'SN', ' S / N '])(
    'casa sem número (%j) vira "S/N"',
    (raw) => {
      expect(parseCustomerInput({ ...VALID, number: raw }).number).toBe('S/N');
    },
  );

  it('referência é opcional: ausente ou em branco vira null', () => {
    expect(
      parseCustomerInput({ ...VALID, reference: undefined }).reference,
    ).toBeNull();
    expect(
      parseCustomerInput({ ...VALID, reference: '  ' }).reference,
    ).toBeNull();
  });

  it('número com mais de 10 caracteres é recusado citando o valor', () => {
    expect(() =>
      parseCustomerInput({ ...VALID, number: '12345678901' }),
    ).toThrow(/"number".*"12345678901".*1 a 10/);
  });

  it('aceita cliente sem telefone', () => {
    const { phone: _phone, ...withoutPhone } = VALID;
    expect(parseCustomerInput(withoutPhone).phone).toBeNull();
  });

  it.each(['name', 'street', 'number', 'deliveryZoneId'])(
    'rejeita sem o campo obrigatório %s',
    (field) => {
      const body: Record<string, unknown> = { ...VALID, [field]: undefined };
      expect(() => parseCustomerInput(body)).toThrow(BadRequestException);
    },
  );
});
