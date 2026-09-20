/** Texto de erro para a tela: a mensagem já vem em português do backend (`ApiError`). */
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : `Erro inesperado: ${String(error)}`;
}
