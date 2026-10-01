import type { MenuImportTarget, MenuSnapshot } from './menu-import-target.js';
import type { MenuPlan } from './menu-types.js';

/** Banco em memória: devolve um retrato fixo e guarda o que seria gravado. */
export class FakeMenuImportTarget implements MenuImportTarget {
  readonly written: MenuPlan[] = [];

  constructor(private readonly snapshot: MenuSnapshot) {}

  async loadSnapshot(): Promise<MenuSnapshot> {
    return this.snapshot;
  }

  async write(plan: MenuPlan): Promise<void> {
    this.written.push(plan);
  }
}
