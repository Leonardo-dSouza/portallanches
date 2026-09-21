import { ApiError } from '../api/api-client';
import { errorMessage } from '../api/error-message';

/** 409 do backend cita a constraint do banco; para o admin basta dizer que o nome já existe. */
export function catalogErrorMessage(failure: unknown): string {
  if (failure instanceof ApiError && failure.status === 409)
    return 'Já existe um cadastro com esse nome: escolha outro nome ou reative o existente (marque "Mostrar inativos").';
  return errorMessage(failure);
}
