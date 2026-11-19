import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  BEBIDAS,
  costTabSheet,
  fakeCostDraft,
  TRADICIONAL,
} from '../test-support/cost-tab-fixture';
import { CategoryCostTab } from './CategoryCostTab';

function renderTab(category = TRADICIONAL) {
  const view = costTabSheet();
  const draft = fakeCostDraft(view);
  render(<CategoryCostTab category={category} view={view} draft={draft} />);
  return { view, draft };
}

const row = (name: string) => screen.getByRole('button', { name });

describe('CategoryCostTab', () => {
  it('a régua mostra para onde vai cada R$ 10 e a regra do preço sugerido', () => {
    renderTab();

    expect(screen.getByText('R$ 4,29 paga os insumos')).toBeVisible();
    expect(screen.getByText('R$ 4,11 vai para o custo fixo')).toBeVisible();
    expect(screen.getByText('R$ 1,60 é lucro')).toBeVisible();
    expect(screen.getByText('custo dos insumos ÷ 0,4293')).toBeVisible();
    expect(
      screen.getByText(
        /vai para os 10 centavos mais perto: de 5 centavos para cima, sobe/,
      ),
    ).toBeVisible();
    expect(screen.getByText(/X Burguer tem meta própria de 10%/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Mudar os % em Cadastros' }),
    ).toHaveAttribute('href', '/cadastros');
  });

  it('as teclas de filtro contam e filtram pelo estado da meta', async () => {
    renderTab();

    expect(row('Hot Dog')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: /Abaixo da meta/ }),
    );

    expect(
      screen.getByRole('button', { name: /Abaixo da meta/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(row('Add Cheddar Fatia')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Hot Dog/ })).toBeNull();
  });

  it('a linha diz o lucro do preço de hoje e o preço sugerido só informa', () => {
    renderTab();

    const burger = row('X Burguer');
    expect(within(burger).getByText('meta própria: 10%')).toBeVisible();
    expect(
      within(burger).getByText('9,0% · perto da meta de 10%'),
    ).toBeVisible();
    expect(within(row('X Salada')).getByText('+ 0,30')).toBeVisible();
    expect(within(row('Hot Dog')).getByText('igual ao cardápio')).toBeVisible();
    expect(
      within(row('Add Cheddar Fatia')).getByText(
        '-40,0% · abaixo da meta de 16%',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Usar/ })).toBeNull();
  });

  it('sem preço ou sem custo, a barra diz o motivo', () => {
    renderTab();

    expect(
      within(row('Lanche novo')).getByText('sem preço no cardápio'),
    ).toBeVisible();
    expect(
      within(row('Misto sem custo')).getByText(
        'sem custo: ponha o preço do insumo em Insumos',
      ),
    ).toBeVisible();
  });

  it('abrir o lanche mostra a receita e a conta passo a passo', async () => {
    renderTab();

    await userEvent.click(row('X Burguer'));

    expect(row('X Burguer')).toHaveAttribute('aria-expanded', 'true');
    const account = screen.getByRole('region', {
      name: 'A conta do X Burguer',
    });
    expect(within(account).getByText('48,93%')).toBeVisible();
    expect(
      within(account).getByText(
        'R$ 8,48 ÷ 0,4893 = R$ 17,33, que desce para R$ 17,30',
      ),
    ).toBeVisible();
    expect(
      within(account).getByText(
        'R$ 17,00 − R$ 6,99 de custo fixo − R$ 8,48 de insumos',
      ),
    ).toBeVisible();
    expect(
      within(account).getByText(
        '9,0% do preço: 1 ponto abaixo da meta de 10%, dentro da folga de 2 pontos.',
      ),
    ).toBeVisible();
    expect(
      within(account).getByText(
        'Já cobre a comissão de 28% e deixa 10% de lucro.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Receita do X Burguer' }),
    ).toBeVisible();
  });

  it('o combo explica que o custo vem dos itens', async () => {
    renderTab();

    await userEvent.click(row('Combo X Salada'));

    expect(screen.getByText(/o custo vem dos itens do combo/)).toBeVisible();
    expect(
      screen.queryByRole('region', { name: /Receita do Combo/ }),
    ).toBeNull();
  });

  it('categoria sem meta mostra custo e sobra, sem régua nem sugerido', () => {
    renderTab(BEBIDAS);

    expect(screen.getByText(/Sem meta de lucro nesta categoria/)).toBeVisible();
    expect(within(row('Coca lata')).getByText('R$ 2,90')).toBeVisible();
    expect(within(row('Coca lata')).getByText('48,3% do preço')).toBeVisible();
    expect(screen.queryByText('Preço sugerido')).toBeNull();
  });
});
