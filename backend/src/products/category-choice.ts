import { UnprocessableEntityException } from '@nestjs/common';
import type { CategoryRecord } from './product-category-repository.js';

function refuse(problem: string): never {
  throw new UnprocessableEntityException(
    `${problem}; esperado uma categoria que só guarda as opções da escolha (ex.: Pão) ou null`,
  );
}

function findTarget(targetId: number, all: CategoryRecord[]): CategoryRecord {
  const target = all.find((c) => c.id === targetId);
  if (!target) refuse(`Categoria de escolha ${targetId} não existe`);
  if (target.addonCategoryId !== null || target.choiceCategoryId !== null)
    refuse(
      `"${target.name}" tem adicionais ou escolha própria e não pode ser lista de escolha`,
    );
  return target;
}

function assertNotAddonList(target: CategoryRecord, all: CategoryRecord[]) {
  const usedBy = all.find((c) => c.addonCategoryId === target.id);
  if (usedBy)
    refuse(`"${target.name}" já é a lista de adicionais de "${usedBy.name}"`);
}

/** Quem pede a escolha vende itens: não pode ser lista de escolha nem de adicionais de outra. */
function assertSellsItems(categoryId: number, all: CategoryRecord[]) {
  const chooser = all.find((c) => c.choiceCategoryId === categoryId);
  if (chooser)
    refuse(`Categoria ${categoryId} já é a escolha de "${chooser.name}"`);
  const addonOf = all.find((c) => c.addonCategoryId === categoryId);
  if (addonOf)
    refuse(
      `Categoria ${categoryId} é a lista de adicionais de "${addonOf.name}"`,
    );
}

/**
 * Confere a escolha obrigatória de uma categoria (2026-11-08: Artesanal → Pão), um nível só, como
 * os adicionais: não pode ser ela mesma, tem de existir, não pode ter adicionais nem escolha
 * própria, não pode ser lista de adicionais, e uma categoria que já é lista (de escolha ou de
 * adicionais) de outra não ganha escolha. `targetId` null = tirar a escolha.
 *
 * @example assertChoiceTarget(2, 12, categories) // Artesanal → Pão
 */
export function assertChoiceTarget(
  categoryId: number,
  targetId: number | null,
  all: CategoryRecord[],
): void {
  if (targetId === null) return;
  if (targetId === categoryId)
    refuse(
      `Categoria ${categoryId} não pode pedir escolha da própria categoria`,
    );
  assertNotAddonList(findTarget(targetId, all), all);
  assertSellsItems(categoryId, all);
}
