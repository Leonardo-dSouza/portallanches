import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { MotoboyRate } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

const rate = (
  id: number,
  dayGroup: MotoboyRate['dayGroup'],
  amount: string,
  effectiveFrom: string,
): MotoboyRate => ({ id, dayGroup, amount, effectiveFrom, createdById: 1 });

function seededApi() {
  const api = new FakeApiClient();
  api.rates = [
    rate(1, 'TUE_THU', '40.00', '2026-01-01'),
    rate(2, 'FRI_SUN', '60.00', '2026-01-01'),
    rate(3, 'FRI_SUN', '70.00', '2026-10-01'),
  ];
  return api;
}

async function openRates(api = seededApi()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage today="2026-09-22" />
    </ApiContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('tab', { name: 'Diária do motoboy' }),
  );
  await screen.findByRole('region', { name: 'Terça a quinta' });
  return api;
}

const group = (name: string) => screen.getByRole('region', { name });
const current = (name: string) => group(name).querySelector('.rate-current');

async function fillRate(dayGroup: string, amount: string, from?: string) {
  if (dayGroup)
    await userEvent.selectOptions(screen.getByLabelText('Dias'), dayGroup);
  await userEvent.type(screen.getByLabelText('Valor da diária'), amount);
  if (from !== undefined)
    fireEvent.change(screen.getByLabelText('Vale a partir de'), {
      target: { value: from },
    });
  await userEvent.click(screen.getByRole('button', { name: 'Salvar diária' }));
}

describe('CatalogPage: diária do motoboy', () => {
  it('mostra a diária em vigor hoje por grupo e marca a agendada', async () => {
    await openRates();
    expect(current('Terça a quinta')).toHaveTextContent('R$ 40,00');
    const friSun = group('Sexta a domingo');
    expect(current('Sexta a domingo')).toHaveTextContent('R$ 60,00');
    expect(within(friSun).getByText('Agendada')).toBeInTheDocument();
    expect(within(friSun).getByText('Vigente')).toBeInTheDocument();
  });

  it('avisa que a mudança vale só para dias sem lançamentos', async () => {
    await openRates();
    expect(
      screen.getByText(/mantêm a diária com que nasceram/),
    ).toBeInTheDocument();
  });

  it('cadastra nova diária com valor em formato da API e data escolhida', async () => {
    const api = await openRates();
    await fillRate('TUE_THU', '45,5', '2026-11-01');
    const posted = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/motoboy-rates',
    );
    expect(posted?.body).toEqual({
      dayGroup: 'TUE_THU',
      amount: '45.50',
      effectiveFrom: '2026-11-01',
    });
    expect(
      await within(group('Terça a quinta')).findByText('R$ 45,50'),
    ).toBeInTheDocument();
  });

  it('a data começa em hoje', async () => {
    await openRates();
    expect(screen.getByLabelText('Vale a partir de')).toHaveValue('2026-09-22');
  });

  it('corrigir o mesmo grupo e data troca o valor sem criar outra linha', async () => {
    await openRates();
    await fillRate('FRI_SUN', '600', '2026-12-01');
    await within(group('Sexta a domingo')).findByText('R$ 600,00');
    await userEvent.selectOptions(screen.getByLabelText('Dias'), 'FRI_SUN');
    await userEvent.type(screen.getByLabelText('Valor da diária'), '60');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar diária' }),
    );
    const friSun = group('Sexta a domingo');
    await waitFor(() =>
      expect(within(friSun).queryByText('R$ 600,00')).toBeNull(),
    );
    expect(
      within(friSun).getAllByText('R$ 60,00', { selector: 'strong' }),
    ).toHaveLength(2);
    expect(within(friSun).getAllByText('01/12/2026')).toHaveLength(1);
  });

  it.each([
    ['sem grupo', '', '65', undefined, 'Escolha o grupo'],
    ['valor zero', 'FRI_SUN', '0', undefined, '"0"'],
    ['data vazia', 'FRI_SUN', '65', '', 'Data inválida'],
  ])(
    '%s: mostra o problema e não chama a API',
    async (_name, dayGroup, amount, from, message) => {
      const api = await openRates();
      await fillRate(dayGroup, amount, from);
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(api.calls.some((c) => c.method === 'POST')).toBe(false);
    },
  );

  it('sem nenhuma diária em vigor avisa que é preciso cadastrar', async () => {
    const api = new FakeApiClient();
    await openRates(api);
    expect(
      within(group('Terça a quinta')).getByText(/Sem diária em vigor/),
    ).toBeInTheDocument();
  });
});
