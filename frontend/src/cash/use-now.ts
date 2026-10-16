import { useEffect, useState } from 'react';

/**
 * A hora atual, renovada a cada `intervalMs` (padrão 30 s): o "há 12 min" do status anda
 * sozinho na lista sem recarregar os pedidos.
 *
 * @example const now = useNow(); elapsedLabel(order.statusChangedAt, now);
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
