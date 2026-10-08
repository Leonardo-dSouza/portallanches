import { useId, type ReactNode } from 'react';

interface AnalyticsSectionProps {
  title: string;
  /** Como ler o bloco (ex.: "média por noite aberta"). */
  note?: string;
  /** Ocupa a linha inteira da grade (gráfico dia a dia). */
  wide?: boolean;
  children: ReactNode;
}

/** Bloco da análise: `<section>` com nome acessível (o título) para navegar por regiões. */
export function AnalyticsSection(props: AnalyticsSectionProps) {
  const titleId = useId();
  return (
    <section
      className="card analytics-section"
      data-wide={props.wide ?? false}
      aria-labelledby={titleId}
    >
      <h2 id={titleId}>{props.title}</h2>
      {props.note && <p className="analytics-note">{props.note}</p>}
      {props.children}
    </section>
  );
}
