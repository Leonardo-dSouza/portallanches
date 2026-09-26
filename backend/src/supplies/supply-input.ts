import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseQuantity } from '../common/quantity.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';

const MAX_NAME_LENGTH = 80;
const MAX_UNIT_LENGTH = 20;
const MAX_PACKAGES = 10;

/** Embalagem de compra: `quantity` unidades de contagem do insumo (ex.: fardo = 6). */
export interface SupplyPackageInput {
  name: string;
  quantity: string;
}

export interface SupplyInput {
  name: string;
  countUnit: string;
  /** Estoque mínimo na unidade de contagem; null = sem alerta de baixa. */
  minStock: string | null;
  active: boolean;
  packages: SupplyPackageInput[];
}

function parsePackage(raw: unknown, index: number): SupplyPackageInput {
  const fields = parseObject(raw, `embalagem ${index + 1}`);
  return {
    name: parseText(fields.name, `packages[${index}].name`, MAX_UNIT_LENGTH),
    quantity: parseQuantity(
      fields.quantity,
      `packages[${index}].quantity`,
      false,
    ),
  };
}

function assertDistinctNames(packages: SupplyPackageInput[]): void {
  const keys = packages.map((p) => toNeighborhoodKey(p.name));
  const repeated = keys.find((key, i) => keys.indexOf(key) !== i);
  if (repeated === undefined) return;
  throw new BadRequestException(
    `Embalagem repetida: "${repeated}" aparece mais de uma vez, esperado um nome por embalagem`,
  );
}

function parsePackages(raw: unknown): SupplyPackageInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_PACKAGES)
    throw new BadRequestException(
      `Campo "packages" inválido: recebido ${JSON.stringify(raw)}, esperado lista com até ${MAX_PACKAGES} embalagens`,
    );
  const packages = raw.map(parsePackage);
  assertDistinctNames(packages);
  return packages;
}

/**
 * Valida o corpo de um insumo; `active` ausente vale true (insumo novo nasce ativo).
 *
 * @example parseSupplyInput({ name: 'Hambúrguer 56g', countUnit: 'un', minStock: 40, packages: [{ name: 'caixa', quantity: 36 }] })
 */
export function parseSupplyInput(body: unknown): SupplyInput {
  const fields = parseObject(body, 'insumo');
  const absent = (value: unknown) => value === undefined || value === null;
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    countUnit: parseText(fields.countUnit, 'countUnit', MAX_UNIT_LENGTH),
    minStock: absent(fields.minStock)
      ? null
      : parseQuantity(fields.minStock, 'minStock', true),
    active: absent(fields.active)
      ? true
      : parseBoolean(fields.active, 'active'),
    packages: parsePackages(fields.packages),
  };
}
