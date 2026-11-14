import { Search } from 'lucide-react';

interface SearchFieldProps {
  /** Nome para o leitor de tela (o campo não tem rótulo visível). */
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
  /** Recebe o foco quando o diálogo abre (o `Dialog` foca o `data-autofocus`). */
  autoFocus?: boolean;
}

/**
 * Busca de lista com a lupa, no mesmo visual da busca do Cardápio.
 *
 * @example <SearchField label="Buscar produto" placeholder="Nome ou código" value={q} onChange={setQ} />
 */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  autoFocus = false,
}: SearchFieldProps) {
  return (
    <label className="menu-search">
      <Search aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        // Os dois: `data-autofocus` quando o diálogo abre já com o campo; `autoFocus` quando o
        // campo aparece depois (a lista do "Ligar a insumo" espera os insumos carregarem).
        data-autofocus={autoFocus || undefined}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
