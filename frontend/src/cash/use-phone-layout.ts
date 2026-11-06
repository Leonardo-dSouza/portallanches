import { useEffect, useState } from 'react';

/**
 * Media query padrão do celular: abaixo de 48 rem (768 px), como definido nas variantes
 * `max-md:` do Tailwind e nos arquivos `frontend/src/styles/phone/`.
 */
export const PHONE_QUERY = '(max-width: 47.99rem)';

/**
 * Escuta mudanças no media query do celular e devolve `true` quando a viewport encaixar.
 *
 * Aceita `matchMediaFn` para substituição nos testes (injeção via parâmetro, sem vazar
 * para outros testes). Quando `window.matchMedia` não existir (JSDOM), devolve `false`,
 * então todos os testes de desktop continuam enxergando o layout original sem mudança.
 *
 * @example const isPhone = useIsPhone(); // false no desktop, true no celular
 */
export function useIsPhone(
  matchMediaFn?: (query: string) => MediaQueryList,
): boolean {
  const [isPhone, setIsPhone] = useState(() => {
    // No celular (2026-11-05): a primeira leitura é síncrona para evitar um flash de layout
    // errado antes da hidratação; JSDOM não tem matchMedia, então devolve false por padrão.
    const fn = matchMediaFn ?? window.matchMedia?.bind(window);
    if (!fn) return false;
    return fn(PHONE_QUERY).matches;
  });

  useEffect(() => {
    const fn = matchMediaFn ?? window.matchMedia?.bind(window);
    if (!fn) return;
    const mql = fn(PHONE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsPhone(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [matchMediaFn]);

  return isPhone;
}
