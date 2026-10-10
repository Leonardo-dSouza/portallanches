import { UnprocessableEntityException } from '@nestjs/common';
import type { CategoryRecord } from './product-category-repository.js';

function refuse(problem: string): never {
  throw new UnprocessableEntityException(
    `${problem}; esperado uma categoria que só guarda adicionais (ex.: Adicionais) ou null`,
  );
}

/**
 * Confere a lista de adicionais escolhida para uma categoria (um nível só): não pode ser ela
 * mesma, tem de existir, não pode ter adicionais próprios, e uma categoria que já é a lista de
 * adicionais de outras não ganha adicionais. `targetId` null = tirar os adicionais.
 *
 * @example assertAddonTarget(2, 3, categories) // Artesanal → Adicionais
 */
export function assertAddonTarget(
  categoryId: number,
  targetId: number | null,
  all: CategoryRecord[],
): void {
  if (targetId === null) return;
  if (targetId === categoryId)
    refuse(
      `Categoria ${categoryId} não pode usar a própria categoria como adicionais`,
    );
  const target = all.find((c) => c.id === targetId);
  if (!target) refuse(`Categoria de adicionais ${targetId} não existe`);
  if (target.addonCategoryId !== null)
    refuse(
      `"${target.name}" tem adicionais próprios e não pode ser lista de adicionais`,
    );
  const usedBy = all.find((c) => c.addonCategoryId === categoryId);
  if (usedBy)
    refuse(
      `Categoria ${categoryId} já é a lista de adicionais de "${usedBy.name}"`,
    );
}
