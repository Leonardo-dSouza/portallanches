import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/api-client';
import type { ImportApi, ImportKind, ImportResult } from '../api/import-api';
import { ImportsTab } from './ImportsTab';

interface ImportCall {
  kind: ImportKind;
  fileBase64: string;
  apply: boolean;
}

/** API de importação em memória: devolve a simulação configurada e guarda as chamadas. */
class FakeImportApi implements ImportApi {
  readonly calls: ImportCall[] = [];
  failure: Error | null = null;

  private readonly simulation: ImportResult;

  constructor(simulation: ImportResult) {
    this.simulation = simulation;
  }

  async runImport(kind: ImportKind, fileBase64: string, apply: boolean) {
    this.calls.push({ kind, fileBase64, apply });
    if (this.failure) throw this.failure;
    return apply
      ? { ...this.simulation, outcome: 'applied' as const }
      : this.simulation;
  }
}

const SIMULATION: ImportResult = {
  outcome: 'dry-run',
  issues: [
    { severity: 'warning', where: 'Plan1!E6', message: '"Fanta" sem custo' },
  ],
  changes: [
    '+ "Fanta Lt 350ml" · Refrigerantes: preço 6.00, CMV sem custo',
    '- "Soda Lt 350" · Refrigerantes: desativado (sumiu da planilha)',
  ],
  summary: { supplies: 1, products: [{ category: 'Refrigerantes', count: 1 }] },
};

const readFake = async (file: File) => `base64:${file.name}`;

async function simulateBeverages(api: FakeImportApi) {
  render(<ImportsTab imports={api} readFile={readFake} />);
  const simulate = screen.getByRole('button', { name: 'Simular importação' });
  expect(simulate).toBeDisabled();
  await userEvent.click(screen.getByRole('radio', { name: 'Bebidas' }));
  const file = new File(['x'], 'Bebidas.xlsx');
  await userEvent.upload(screen.getByLabelText('Arquivo da planilha'), file);
  await userEvent.click(simulate);
}

describe('ImportsTab', () => {
  it('simula, destaca o que será desativado e grava a mesma planilha', async () => {
    const api = new FakeImportApi(SIMULATION);
    await simulateBeverages(api);
    expect(api.calls).toEqual([
      { kind: 'bebidas', fileBase64: 'base64:Bebidas.xlsx', apply: false },
    ]);
    const report = screen.getByRole('region', {
      name: 'Resultado da importação',
    });
    expect(within(report).getByText(/Serão desativados/)).toBeInTheDocument();
    expect(within(report).getByText(/"Soda Lt 350"/)).toBeInTheDocument();
    expect(within(report).getByText('"Fanta" sem custo')).toBeInTheDocument();
    expect(
      within(report).getByText('1 insumos · Refrigerantes 1'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Gravar e desativar 1' }),
    );
    expect(api.calls[1].apply).toBe(true);
    expect(await screen.findByText('Importação gravada.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Gravar/ }),
    ).not.toBeInTheDocument();
  });

  it('com erro na planilha não oferece gravar', async () => {
    const blocked: ImportResult = {
      ...SIMULATION,
      outcome: 'blocked',
      issues: [{ severity: 'error', where: 'Plan1!5', message: 'repetido' }],
    };
    await simulateBeverages(new FakeImportApi(blocked));
    expect(screen.getByText(/A planilha tem erros/)).toBeInTheDocument();
    expect(screen.getByText('repetido')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Gravar/ }),
    ).not.toBeInTheDocument();
  });

  it('sem mudanças diz que já está igual, sem botão de gravar', async () => {
    await simulateBeverages(new FakeImportApi({ ...SIMULATION, changes: [] }));
    expect(
      screen.getByText(/Nada a gravar: o sistema já está igual/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Gravar/ }),
    ).not.toBeInTheDocument();
  });

  it('falha da API aparece como alerta; trocar o arquivo limpa o resultado', async () => {
    const api = new FakeImportApi(SIMULATION);
    api.failure = new ApiError(422, 'Não deu para abrir o arquivo');
    await simulateBeverages(api);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não deu para abrir o arquivo',
    );
    await userEvent.upload(
      screen.getByLabelText('Arquivo da planilha'),
      new File(['y'], 'outra.xlsx'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
