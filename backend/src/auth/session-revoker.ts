export const SESSION_REVOKER = Symbol('SESSION_REVOKER');

/** O que outros módulos precisam da autenticação: derrubar sessões de um usuário. */
export interface SessionRevoker {
  revokeSessions(userId: number): void;
}
