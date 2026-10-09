import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseQuantity } from '../common/quantity.js';
import { parseUnitCost } from '../common/unit-cost.js';
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
  /** Custo em R$ por unidade de contagem (base do CMV); null = sem custo cadastrado. */
  unitCost: string | null;
  /**
   * Se a venda de um lanche desconta este insumo do estoque (Entregável 3). Falso para o
   * que só se controla por contagem (tomate, queijo peça); o insumo continua no Estoque.
   */
  deductOnSale: boolean;
  /** "Contar todo dia": a Contagem do dia mostra e a Situação avisa enquanto faltar. */
  dailyCount: boolean;
  /** Seção do estoque (GET /supplies/sections); null = "Sem seção". */
  sectionId: number | null;
  active: boolean;
  packages: SupplyPackageInput[];
  /**
   * Preço de venda do produto 1:1 do insumo (bebida), gravado no produto do Cardápio.
   * undefined = não mexe; null = tira o preço.
   */
  salePrice?: string | null;
}

function parseSalePrice(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return raw;
  return parseMoney(raw, 'salePrice', true);
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
 * Valida o corpo de um insumo; `active` ausente vale true (insumo novo nasce ativo) e
 * `deductOnSale` e `dailyCount` ausentes valem false: desde 2026-10-09 a baixa tira do estoque
 * a cada pedido, e insumo novo só baixa se o dono ligar.
 *
 * @example parseSupplyInput({ name: 'Hambúrguer 56g', countUnit: 'un', minStock: 40, unitCost: 2.35, packages: [{ name: 'caixa', quantity: 36 }] })
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
    unitCost: absent(fields.unitCost)
      ? null
      : parseUnitCost(fields.unitCost, 'unitCost'),
    deductOnSale: absent(fields.deductOnSale)
      ? false
      : parseBoolean(fields.deductOnSale, 'deductOnSale'),
    dailyCount: absent(fields.dailyCount)
      ? false
      : parseBoolean(fields.dailyCount, 'dailyCount'),
    sectionId: absent(fields.sectionId)
      ? null
      : parseId(fields.sectionId, 'sectionId'),
    active: absent(fields.active)
      ? true
      : parseBoolean(fields.active, 'active'),
    packages: parsePackages(fields.packages),
    salePrice: parseSalePrice(fields.salePrice),
  };
}
