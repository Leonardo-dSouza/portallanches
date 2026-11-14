import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { TabBar } from './TabBar';

export interface SubSection {
  id: string;
  label: string;
  /** Ícone opcional antes do rótulo (as abas grandes de Compras). */
  icon?: LucideIcon;
  render(): ReactNode;
}

interface SubSectionsProps {
  sections: SubSection[];
  /** Sub-aba de entrada (ex.: `?aba=noites` na Análise); padrão: a primeira. */
  initial?: string;
  /** `sub` (padrão): pílulas pequenas; `big`: teclas largas, quando as abas são a tela toda. */
  variant?: 'sub' | 'big';
}

/**
 * Telas pequenas juntas numa aba, cada uma na sua sub-aba (2026-10-11: os Cadastros tinham 9
 * abas; o Histórico virou a aba Noites da Análise).
 *
 * @example <SubSections sections={[{ id: 'zones', label: 'Bairros', render: () => <ZonesTab … /> }]} />
 */
export function SubSections({
  sections,
  initial,
  variant = 'sub',
}: SubSectionsProps) {
  const [active, setActive] = useState(initial ?? sections[0].id);
  const current = sections.find((s) => s.id === active) ?? sections[0];
  return (
    <>
      <TabBar
        variant={variant}
        tabs={sections.map(({ id, label, icon }) => ({ id, label, icon }))}
        active={current.id}
        onSelect={setActive}
      />
      <div key={current.id} className="tab-panel">
        {current.render()}
      </div>
    </>
  );
}
