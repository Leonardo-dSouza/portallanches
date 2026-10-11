import { useState, type ReactNode } from 'react';
import { TabBar } from '../components/TabBar';

export interface SubSection {
  id: string;
  label: string;
  render(): ReactNode;
}

/**
 * Cadastros pequenos juntos numa aba, cada um na sua sub-aba (2026-10-11: os Cadastros tinham
 * 9 abas). Abre na primeira.
 *
 * @example <SubSections sections={[{ id: 'zones', label: 'Bairros', render: () => <ZonesTab … /> }]} />
 */
export function SubSections({ sections }: { sections: SubSection[] }) {
  const [active, setActive] = useState(sections[0].id);
  const current = sections.find((s) => s.id === active) ?? sections[0];
  return (
    <>
      <TabBar
        sub
        tabs={sections.map(({ id, label }) => ({ id, label }))}
        active={current.id}
        onSelect={setActive}
      />
      <div key={current.id} className="tab-panel">
        {current.render()}
      </div>
    </>
  );
}
