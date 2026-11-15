import type { Parsed } from './catalog-values';

/** Quantidade exata de números do código do gerente (2026-11-15). */
export const MANAGER_PIN_LENGTH = 6;

/**
 * Remove qualquer caractere que não seja dígito e corta no tamanho do código.
 *
 * @example cleanPinDigits('12a34567') // '123456'
 */
export function cleanPinDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, MANAGER_PIN_LENGTH);
}

/**
 * Texto da situação do código do gerente na aba Senhas.
 *
 * @example managerPinSituation(true) // 'Cadastrado.'
 */
export function managerPinSituation(configured: boolean): string {
  return configured
    ? 'Cadastrado.'
    : 'Ainda não cadastrado: a trava do caixa não libera nada até você cadastrar.';
}

/**
 * Validação do código novo no front: 6 números e os dois campos iguais.
 * A mensagem nunca repete o código digitado para não expor dado sensível.
 *
 * @example parseManagerPin('135790', '135790') // { ok: true, value: '135790' }
 */
export function parseManagerPin(pin: string, repeated: string): Parsed<string> {
  if (pin.length !== MANAGER_PIN_LENGTH) {
    return {
      ok: false,
      error: 'Código novo precisa ter 6 números',
    };
  }
  if (pin !== repeated) {
    return {
      ok: false,
      error: 'Os dois códigos não batem: digite o mesmo nos dois campos',
    };
  }
  return { ok: true, value: pin };
}
