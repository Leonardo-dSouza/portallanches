import { Search } from 'lucide-react';

interface SearchFieldProps {
  /** Nome para o leitor de tela (o campo não tem rótulo visível). */
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
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
}: SearchFieldProps) {
  return (
    <label className="menu-search">
      <Search aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
