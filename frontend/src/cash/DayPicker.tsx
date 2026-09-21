interface DayPickerProps {
  value: string;
  /** `true` quando a tela está no "hoje" do servidor (sem data escolhida). */
  isToday: boolean;
  onPick(date: string | null): void;
}

/**
 * Escolhe o dia do caixa: o "hoje" vem do servidor, mas o usuário pode corrigir a data
 * sem depender de relógio ou fuso. Campo vazio (limpar no calendário) é ignorado.
 */
export function DayPicker({ value, isToday, onPick }: DayPickerProps) {
  return (
    <div className="day-picker">
      <label className="day-picker-field">
        <span>Data do caixa</span>
        <input
          type="date"
          value={value}
          onChange={(event) => event.target.value && onPick(event.target.value)}
        />
      </label>
      {!isToday && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onPick(null)}
        >
          Voltar para hoje
        </button>
      )}
    </div>
  );
}
