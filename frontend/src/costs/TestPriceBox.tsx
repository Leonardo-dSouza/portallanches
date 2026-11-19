import { useEffect, useState } from 'react';
import type { ProductCostView } from '../api/cost-types';
import { formatMoney, toApiMoney } from '../api/money';
import type { CostDraft } from './use-cost-draft';

/** Resultado do teste: vazio, aviso de digitação ou a linha simulada. */
type TestResult =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'done'; view: ProductCostView };

const DEBOUNCE_MS = 300;

interface SimulatedAnswer {
  price: string;
  view: ProductCostView;
}

/** Pede a prévia do preço com espera curta entre as teclas; a resposta lembra o preço pedido. */
function useDebouncedSimulation(
  productId: number,
  price: string | null,
  simulate: CostDraft['simulateSalePrice'],
): SimulatedAnswer | null {
  const [answer, setAnswer] = useState<SimulatedAnswer | null>(null);
  useEffect(() => {
    if (price === null) return;
    let active = true;
    const timer = setTimeout(async () => {
      // Falha da prévia (rede, 400) só apaga o resultado: o teste não grava nada.
      const view = await simulate(productId, price).catch(() => null);
      if (active) setAnswer(view ? { price, view } : null);
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [productId, price, simulate]);
  return answer;
}

/** O que mostrar para o texto digitado: nada, aviso ou o lucro do preço. */
function useSimulatedPrice(
  productId: number,
  typed: string,
  draft: Pick<CostDraft, 'simulateSalePrice'>,
): TestResult {
  const price = typed.trim() ? toApiMoney(typed) : null;
  // A função muda só quando o rascunho muda: aí o teste refaz a conta com os custos novos.
  const answer = useDebouncedSimulation(
    productId,
    price,
    draft.simulateSalePrice,
  );
  if (!typed.trim()) return { kind: 'idle' };
  if (price === null) return { kind: 'invalid' };
  if (answer?.price !== price) return { kind: 'idle' };
  return { kind: 'done', view: answer.view };
}

function TestOutcome({ result }: { result: TestResult }) {
  if (result.kind === 'invalid')
    return (
      <span className="test-price-hint">Digite um preço (ex.: 18,00)</span>
    );
  if (result.kind !== 'done' || result.view.profit === null) return null;
  const { profit, marginPercent } = result.view;
  return (
    <span className="test-price-outcome" aria-live="polite">
      lucro <strong>{formatMoney(profit)}</strong>
      {marginPercent && <span>{marginPercent.replace('.', ',')}%</span>}
    </span>
  );
}

/**
 * "Testar outro preço": mostra o lucro de um preço sem gravar nada. A tela de Custos só calcula; o
 * preço do cardápio muda em Cadastros, depois de avisar os clientes (pedido do usuário, 2026-11-18).
 *
 * @example <TestPriceBox productId={8} draft={draft} />
 */
export function TestPriceBox({
  productId,
  draft,
}: {
  productId: number;
  draft: Pick<CostDraft, 'simulateSalePrice'>;
}) {
  const [typed, setTyped] = useState('');
  const result = useSimulatedPrice(productId, typed, draft);
  const inputId = `test-price-${productId}`;
  return (
    <div className="test-price">
      <div className="test-price-row">
        <label htmlFor={inputId}>
          <strong>Testar outro preço</strong> R$
        </label>
        <input
          id={inputId}
          className="cell-input cell-input-short"
          inputMode="decimal"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <TestOutcome result={result} />
      </div>
      <p className="hint">
        Só testa: o cardápio não muda. O preço muda em Cadastros, quando você
        for anunciar.
      </p>
    </div>
  );
}
