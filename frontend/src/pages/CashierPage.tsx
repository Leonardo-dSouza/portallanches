import { useState } from 'react';
import { CashDayScreen } from '../cash/CashDayScreen';
import { toDateKey } from '../history/date-keys';

interface CashierPageProps {
  /** Só para os testes fixarem "hoje" (`AAAA-MM-DD`); em uso normal é a data local. */
  today?: string;
}

/**
 * Caixa: começa no "hoje" do servidor e deixa o usuário escolher outra data.
 * A `key` remonta a tela por data, então abas e formulários nunca misturam dias.
 */
export function CashierPage({ today }: CashierPageProps) {
  const [date, setDate] = useState<string | null>(null);
  const [todayKey] = useState(() => today ?? toDateKey(new Date()));
  return (
    <CashDayScreen
      key={date ?? 'hoje'}
      date={date}
      today={todayKey}
      onPickDate={setDate}
    />
  );
}
