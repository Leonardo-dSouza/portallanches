export type UserRole = 'CAIXA' | 'ADMIN';

/** Usuário autenticado, anexado à requisição pelo `AuthGuard`. */
export interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
}
