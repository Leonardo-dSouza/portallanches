// Casa sem número: "s/n", "SN" e "S / N" viram "S/N", a mesma forma que o servidor grava.
const NO_NUMBER = /^s\s*\/?\s*n$/i;

/**
 * Número da casa aparado, com as formas de "sem número" padronizadas.
 *
 * @example normalizeHouseNumber(' sn ') // 'S/N'
 */
export function normalizeHouseNumber(typed: string): string {
  const number = typed.trim();
  return NO_NUMBER.test(number) ? 'S/N' : number;
}

/**
 * Rua com o número, como sai na comanda; clientes antigos (sem número) ficam só com a rua.
 *
 * @example formatAddress('Rua A', '123') // 'Rua A, 123'
 */
export function formatAddress(street: string, number: string | null): string {
  return number ? `${street}, ${number}` : street;
}
