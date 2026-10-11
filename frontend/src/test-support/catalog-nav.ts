import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Abre uma aba dos Cadastros e, se houver, a sub-aba dela (2026-10-11: "Entregas" → "Bairros",
 * "Pagamentos e gastos" → "Tipos de gasto"…).
 *
 * @example await openCatalogSection('Entregas', 'Bairros');
 */
export async function openCatalogSection(main: string, sub?: string) {
  await userEvent.click(await screen.findByRole('tab', { name: main }));
  if (sub) await userEvent.click(await screen.findByRole('tab', { name: sub }));
}

/** Abre o painel do "Novo …" de um cadastro. */
export async function openNewPanel(label: string) {
  await userEvent.click(await screen.findByRole('button', { name: label }));
}
