import type { SupplySeedSection } from './supply-seed-list.js';
import { SUPPLY_SEED } from './supply-seed-list.js';
import { planSupplySeed, type SeedExistingSupply } from './supply-seed-plan.js';

const SECTIONS = [
  { id: 1, nameKey: 'geladeira' },
  { id: 2, nameKey: 'alimentos' },
];

const SEED: SupplySeedSection[] = [
  {
    section: 'Geladeira',
    supplies: [
      { name: 'Alface' },
      { name: 'Hambúrguer', aliases: ['Hambúrguer 56g'] },
    ],
  },
  {
    section: 'Alimentos',
    supplies: [
      { name: 'Pão de hambúrguer', aliases: ['Pão hambúrguer/hot dog'] },
      { name: 'Pão de hot', aliases: ['Pão hambúrguer/hot dog'] },
      { name: 'Milho' },
    ],
  },
];

const existing = (
  id: number,
  name: string,
  nameKey: string,
  sectionId: number | null = null,
): SeedExistingSupply => ({ id, name, nameKey, sectionId });

describe('planSupplySeed', () => {
  it('cria o que não existe, com a seção do grupo', () => {
    const plan = planSupplySeed(SEED, [], SECTIONS);
    expect(plan.create.map((c) => [c.name, c.sectionId])).toContainEqual([
      'Milho',
      2,
    ]);
  });

  it('acha pelo nome sem acento e só preenche a seção vazia', () => {
    const plan = planSupplySeed(
      SEED,
      [existing(7, 'ALFACE', 'alface')],
      SECTIONS,
    );
    expect(plan.fillSection).toEqual([{ id: 7, sectionId: 1 }]);
    expect(plan.create.map((c) => c.name)).not.toContain('Alface');
  });

  it('acha pelo alias e não troca a seção já escolhida', () => {
    const plan = planSupplySeed(
      SEED,
      [existing(3, 'Hambúrguer 56g', 'hamburguer 56g', 2)],
      SECTIONS,
    );
    expect(plan.matched).toContainEqual({
      name: 'Hambúrguer',
      existing: 'Hambúrguer 56g',
    });
    expect(plan.fillSection).toEqual([]);
  });

  it('dois nomes no mesmo insumo preenchem a seção uma vez só', () => {
    const plan = planSupplySeed(
      SEED,
      [existing(9, 'Pão hambúrguer/hot dog', 'pao hamburguer/hot dog')],
      SECTIONS,
    );
    expect(plan.fillSection).toEqual([{ id: 9, sectionId: 2 }]);
  });

  it('seção que não existe no banco é erro com o nome', () => {
    expect(() =>
      planSupplySeed([{ section: 'Freezer', supplies: [] }], [], SECTIONS),
    ).toThrow('Seção "Freezer" não existe no banco');
  });

  it('a anotação real não repete nome entre seções', () => {
    const keys = SUPPLY_SEED.flatMap((g) => g.supplies.map((s) => s.name));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
