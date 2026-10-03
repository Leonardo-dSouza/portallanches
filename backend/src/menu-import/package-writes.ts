import type { PlannedSupply } from './menu-types.js';

/**
 * Embalagens de um insumo que já existe: a planilha troca só as que ela conhece; a que o
 * usuário criou na tela (ex.: "galão" do ketchup, peso descoberto depois) fica.
 *
 * @example tx.supply.update({ where, data: { packages: packageWrites(supply.packages) } })
 */
export function packageWrites(packages: PlannedSupply['packages']) {
  return {
    deleteMany: { name: { in: packages.map((p) => p.name) } },
    create: packages,
  };
}
