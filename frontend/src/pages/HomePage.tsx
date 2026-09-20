import { useAuth } from '../auth/auth-context';

/** Provisória: será substituída pela tela do caixa do dia (pedidos, gastos e relatório). */
export function HomePage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h1>Olá, {user?.name}</h1>
      <p>As telas do caixa do dia entram no próximo passo.</p>
    </section>
  );
}
