import type { ReactNode } from 'react';
import type { SectionGroup } from './supply-sections';

interface SectionedRowsProps<T> {
  groups: SectionGroup<T>[];
  /** Colunas da tabela, para o título da seção ocupar a linha inteira. */
  columnCount: number;
  renderRow(item: T): ReactNode;
}

/**
 * Um `<tbody>` por seção, com o nome e a quantidade de itens na primeira linha.
 *
 * @example <SectionedRows groups={groupBySection(items, sections)} columnCount={5} renderRow={(i) => <Row item={i} />} />
 */
export function SectionedRows<T>(props: SectionedRowsProps<T>) {
  const { groups, columnCount, renderRow } = props;
  return groups.map(({ section, items }) => (
    <tbody key={section?.id ?? 'sem-secao'}>
      <tr className="section-row">
        <th colSpan={columnCount} scope="colgroup">
          {section?.name ?? 'Sem seção'}
          <span className="section-row-count">{items.length}</span>
        </th>
      </tr>
      {items.map(renderRow)}
    </tbody>
  ));
}
