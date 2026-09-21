interface SkeletonProps {
  label: string;
  rows?: number;
}

/** Espaço reservado enquanto carrega: mantém o layout no lugar e avisa leitores de tela. */
export function Skeleton({ label, rows = 3 }: SkeletonProps) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton-line" />
      ))}
    </div>
  );
}
