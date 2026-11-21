import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
  DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE,
  parseDeliveryCodeConfirmMessage,
  parseDeliveryCodeRouteMessage,
  readStoredDeliveryCodeConfirmMessage,
  readStoredDeliveryCodeRouteMessage,
} from './delivery-code-messages.js';

describe('delivery-code-messages', () => {
  it('apara, mantém os parágrafos e troca o \\r\\n do Windows', () => {
    expect(
      parseDeliveryCodeConfirmMessage(' Oi!\r\n\r\nCódigo: [CÓDIGO] '),
    ).toBe('Oi!\n\nCódigo: [CÓDIGO]');
    expect(parseDeliveryCodeRouteMessage('Saiu!\nObrigado')).toBe(
      'Saiu!\nObrigado',
    );
  });

  it('a confirmação sem [CÓDIGO] é recusada com o texto recebido', () => {
    expect(() => parseDeliveryCodeConfirmMessage('Pedido confirmado')).toThrow(
      /recebido "Pedido confirmado", esperado o texto com \[CÓDIGO\]/,
    );
  });

  it('a mensagem de saída pode ir sem o código', () => {
    expect(parseDeliveryCodeRouteMessage('Saiu para entrega')).toBe(
      'Saiu para entrega',
    );
  });

  it('recusa vazio, longo demais, não texto e caractere de controle', () => {
    const route = parseDeliveryCodeRouteMessage;
    expect(() => route('   ')).toThrow(BadRequestException);
    expect(() => route('a'.repeat(1001))).toThrow(/1 a 1000 caracteres/);
    expect(() => route(42)).toThrow(BadRequestException);
    expect(() => route('Saiu\tagora')).toThrow(/caractere de controle/);
  });

  it('os padrões passam na própria validação', () => {
    const confirm = DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE;
    expect(parseDeliveryCodeConfirmMessage(confirm)).toBe(confirm);
    const route = DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE;
    expect(parseDeliveryCodeRouteMessage(route)).toBe(route);
  });

  it('nada gravado ou gravado estragado vira o padrão', () => {
    expect(readStoredDeliveryCodeConfirmMessage(null)).toBe(
      DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
    );
    expect(readStoredDeliveryCodeConfirmMessage('sem o código')).toBe(
      DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
    );
    expect(readStoredDeliveryCodeRouteMessage('')).toBe(
      DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE,
    );
    expect(readStoredDeliveryCodeRouteMessage('Saiu!')).toBe('Saiu!');
  });
});
