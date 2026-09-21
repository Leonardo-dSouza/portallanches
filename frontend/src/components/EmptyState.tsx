interface EmptyStateProps {
  title: string;
  hint: string;
}

/** Lista sem itens: diz o que falta e o que fazer, em vez de deixar a tela vazia. */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="card empty-state">
      <svg className="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h4l1.5 3h5L16 13h4M4 13l2.2-7.2A1 1 0 0 1 7.1 5h9.8a1 1 0 0 1 .9.8L20 13M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
      </svg>
      <p className="empty-title">{title}</p>
      <p className="hint">{hint}</p>
    </div>
  );
}
