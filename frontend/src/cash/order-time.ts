/** O dia e a hora do negócio são os de Brasília, mesmo num navegador em outro fuso. */
const BUSINESS_TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Hora em que o pedido foi lançado, para a lista e a comanda.
 *
 * @example formatOrderTime('2026-10-10T23:41:00Z') // '20:41'
 */
export function formatOrderTime(createdAt: string): string {
  return BUSINESS_TIME.format(new Date(createdAt));
}
