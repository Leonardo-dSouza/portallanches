/** Onde o token de sessão fica guardado entre recarregamentos da página. */
export interface TokenStorage {
  read(): string | null;
  write(token: string): void;
  clear(): void;
}

const TOKEN_KEY = 'portallanches.token';

/** `localStorage` pode lançar erro (modo privado, dados bloqueados): nesse caso o app segue sem persistir. */
export function createBrowserTokenStorage(): TokenStorage {
  return {
    read: () => tryStorage(() => localStorage.getItem(TOKEN_KEY), null),
    write: (token) =>
      tryStorage(() => localStorage.setItem(TOKEN_KEY, token), undefined),
    clear: () =>
      tryStorage(() => localStorage.removeItem(TOKEN_KEY), undefined),
  };
}

function tryStorage<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}
