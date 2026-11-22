/** Onde entra o código no texto de Cadastros → Bairros (o mesmo do backend). */
export const DELIVERY_CODE_PLACEHOLDER = '[CÓDIGO]';

/**
 * A mensagem que o caixa manda ao cliente, com os 4 dígitos do pedido no lugar de todo
 * `[CÓDIGO]` (2026-11-21).
 *
 * @example fillDeliveryMessage('Código: *[CÓDIGO]*', '4827') // 'Código: *4827*'
 */
export function fillDeliveryMessage(template: string, code: string): string {
  return template.replaceAll(DELIVERY_CODE_PLACEHOLDER, code);
}
