import { BadRequestException } from '@nestjs/common';
import { describeReceived } from '../common/received-value.js';

export const DELIVERY_CODE_CONFIRM_MESSAGE_KEY =
  'delivery_code_confirm_message';
export const DELIVERY_CODE_ROUTE_MESSAGE_KEY = 'delivery_code_route_message';

/** O caixa copia a mensagem com os 4 dígitos do pedido no lugar disto. */
export const DELIVERY_CODE_PLACEHOLDER = '[CÓDIGO]';
const MAX_MESSAGE_LENGTH = 1000;
/** Caractere de controle que não é a quebra de linha: a mensagem tem parágrafos. */
const CONTROL_EXCEPT_NEWLINE = /[^\P{Cc}\n]/u;

/**
 * Mensagem ao confirmar o pedido (texto combinado com o usuário em 2026-11-21): passa o código.
 * O "*" deixa o código em negrito no WhatsApp.
 */
export const DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE = [
  'Seu pedido da Portal Lanches foi confirmado! ✅',
  '',
  `Para sua segurança, ele tem um código de entrega: *${DELIVERY_CODE_PLACEHOLDER}*`,
  '',
  'Guarde esse código. Na hora de receber, informe ao motoboy. Ele só entrega o pedido para quem disser o código certo.',
  '',
  'Não passe esse código para outras pessoas.',
].join('\n');

/** Mensagem quando o pedido sai para a entrega (2026-11-21): lembra o código. */
export const DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE = [
  'Seu pedido da Portal Lanches está a caminho! 🛵',
  '',
  `Tenha em mãos o código de entrega: *${DELIVERY_CODE_PLACEHOLDER}*`,
  '',
  'O motoboy vai pedir esse código para entregar o pedido.',
  '',
  'Obrigado pela preferência!',
].join('\n');

const invalid = (field: string, raw: unknown, expected: string): never => {
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${describeReceived(raw)}, esperado ${expected}`,
  );
};

/** Texto aparado, com as quebras de linha do Windows (\r\n) trocadas por \n. */
function parseMessage(raw: unknown, field: string): string {
  const text =
    typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : '';
  const sized = text.length > 0 && text.length <= MAX_MESSAGE_LENGTH;
  if (sized && !CONTROL_EXCEPT_NEWLINE.test(text)) return text;
  return invalid(
    field,
    raw,
    `texto de 1 a ${MAX_MESSAGE_LENGTH} caracteres, sem caractere de controle além da quebra de linha`,
  );
}

/**
 * A mensagem da confirmação precisa do código: sem ele, o cliente não tem o que dizer ao motoboy.
 *
 * @example parseDeliveryCodeConfirmMessage('Código: [CÓDIGO]') // 'Código: [CÓDIGO]'
 */
export function parseDeliveryCodeConfirmMessage(raw: unknown): string {
  const field = 'deliveryCodeConfirmMessage';
  const text = parseMessage(raw, field);
  if (text.includes(DELIVERY_CODE_PLACEHOLDER)) return text;
  return invalid(
    field,
    raw,
    `o texto com ${DELIVERY_CODE_PLACEHOLDER} no lugar do código`,
  );
}

/**
 * A mensagem de saída para a entrega; o código nela é opcional.
 *
 * @example parseDeliveryCodeRouteMessage('Saiu! ') // 'Saiu!'
 */
export function parseDeliveryCodeRouteMessage(raw: unknown): string {
  return parseMessage(raw, 'deliveryCodeRouteMessage');
}

/** O gravado, ou o padrão quando falta ou estragou: copiar a mensagem nunca pode falhar. */
function readStoredMessage(
  stored: string | null,
  parse: (raw: unknown) => string,
  fallback: string,
): string {
  if (stored === null) return fallback;
  try {
    return parse(stored);
  } catch {
    return fallback;
  }
}

/** @example readStoredDeliveryCodeConfirmMessage(null) // a mensagem padrão */
export function readStoredDeliveryCodeConfirmMessage(
  stored: string | null,
): string {
  return readStoredMessage(
    stored,
    parseDeliveryCodeConfirmMessage,
    DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
  );
}

/** @example readStoredDeliveryCodeRouteMessage(null) // a mensagem padrão */
export function readStoredDeliveryCodeRouteMessage(
  stored: string | null,
): string {
  return readStoredMessage(
    stored,
    parseDeliveryCodeRouteMessage,
    DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE,
  );
}
