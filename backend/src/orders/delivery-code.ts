import { randomInt } from 'node:crypto';

export const DELIVERY_CODE_SOURCE = Symbol('DELIVERY_CODE_SOURCE');

/** Quem sorteia o código de entrega: o `crypto` na produção, uma fila fixa nos testes. */
export interface DeliveryCodeSource {
  next(): string;
}

/** De 1000 a 9999: o zero da frente se perde quando o cliente fala o código ao motoboy. */
const LOWEST_CODE = 1000;
const ABOVE_HIGHEST_CODE = 10000;
/** Só ~22 dos 9000 são fáceis de chutar: 100 tentativas nunca acabam na prática. */
const MAX_DRAWS = 100;

/**
 * Código que qualquer um chuta: 4 dígitos iguais (1111) ou em sequência (1234, 4321).
 *
 * @example isGuessableCode('1234') // true
 */
export function isGuessableCode(code: string): boolean {
  const digits = code.split('').map(Number);
  const steps = digits.slice(1).map((digit, index) => digit - digits[index]);
  const [first] = steps;
  return Math.abs(first) <= 1 && steps.every((step) => step === first);
}

/**
 * Sorteia o código de entrega até sair um que não seja fácil de chutar. `draw(min, max)` devolve
 * um inteiro de `min` até `max - 1`, como o `crypto.randomInt`.
 *
 * @example randomDeliveryCode(() => 4827) // '4827'
 */
export function randomDeliveryCode(
  draw: (min: number, max: number) => number,
): string {
  let code = '';
  for (let attempt = 0; attempt < MAX_DRAWS; attempt++) {
    code = String(draw(LOWEST_CODE, ABOVE_HIGHEST_CODE));
    if (!isGuessableCode(code)) return code;
  }
  throw new Error(
    `Sorteio do código de entrega falhou: ${MAX_DRAWS} tentativas, a última "${code}"; esperado 4 dígitos fora de 1111/1234/4321`,
  );
}

/** O sorteio de verdade, injetado no `OrderService` pelo `OrdersModule`. */
export const CRYPTO_DELIVERY_CODES: DeliveryCodeSource = {
  next: () => randomDeliveryCode((min, max) => randomInt(min, max)),
};

/**
 * Pedido com código mantém o que já tem ou sorteia um (o caixa errou o bairro e corrigiu, ou
 * ligou depois); sem código, nenhum. Quem decide é o pedido desde 2026-11-21: o bairro só dá o
 * padrão, porque bairros como a Pousada do Vale misturam condomínio e casa.
 *
 * @example deliveryCodeFor(true, '4827', codes) // '4827'
 */
export function deliveryCodeFor(
  wanted: boolean,
  previous: string | null,
  codes: DeliveryCodeSource,
): string | null {
  if (!wanted) return null;
  return previous ?? codes.next();
}
