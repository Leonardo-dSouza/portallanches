interface LoadFailureProps {
  message: string;
  onRetry(): void;
}

/** Falha ao carregar uma lista de cadastro, com botão de tentar de novo. */
export function LoadFailure({ message, onRetry }: LoadFailureProps) {
  return (
    <div className="form-error" role="alert">
      <p>{message}</p>
      <button type="button" className="button-ghost" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}
