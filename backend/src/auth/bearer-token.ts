/**
 * Extrai o token de um header `Authorization: Bearer <token>`.
 * Retorna undefined se o header estiver ausente ou fora desse formato.
 *
 * @example extractBearerToken('Bearer abc123') // 'abc123'
 */
export function extractBearerToken(
  authorization: string | undefined,
): string | undefined {
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) return undefined;
  return token;
}
