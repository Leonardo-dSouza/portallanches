import { isArtisanal } from './artisanal';

interface MenuNumberChipProps {
  number: number;
  categoryName: string;
}

/**
 * Número do cardápio impresso: mostarda no tradicional e invertido (carvão com o número em
 * mostarda) no artesanal, para os dois "9" não se confundirem (pedido do usuário, 2026-10-15).
 *
 * @example <MenuNumberChip number={9} categoryName="Artesanal" />
 */
export function MenuNumberChip({ number, categoryName }: MenuNumberChipProps) {
  return (
    <span
      className="menu-number-chip"
      data-artisanal={isArtisanal(categoryName) || undefined}
    >
      {number}
    </span>
  );
}
