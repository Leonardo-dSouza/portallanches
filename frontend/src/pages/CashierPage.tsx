import { useState } from 'react';
import { CashDayScreen } from '../cash/CashDayScreen';

/**
 * Caixa: começa no "hoje" do servidor e deixa o usuário escolher outra data.
 * A `key` remonta a tela por data, então abas e formulários nunca misturam dias.
 */
export function CashierPage() {
  const [date, setDate] = useState<string | null>(null);
  return (
    <CashDayScreen key={date ?? 'hoje'} date={date} onPickDate={setDate} />
  );
}
