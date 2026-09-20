export type UserRole = 'CAIXA' | 'ADMIN';

export interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: SessionUser;
}
