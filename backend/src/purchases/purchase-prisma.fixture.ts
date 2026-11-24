import type { PrismaClient } from '../generated/prisma/client.js';

/** Linhas que o fake devolve, na forma do `select` de cada consulta. */
export interface PurchasePrismaRows {
  links: unknown[];
  items: unknown[];
  history?: unknown[];
}

/**
 * Fake do Prisma para as consultas de preço de Compras: devolve as linhas dadas, sem filtrar, e guarda o
 * `where` de cada busca de itens de nota. O casamento item×ligação fica a cargo do código testado.
 *
 * @example const fake = new RecordingPurchasePrisma({ links, items }); await listLastPrices(fake.asPrisma());
 */
export class RecordingPurchasePrisma {
  /** `where` de cada chamada a purchaseInvoiceItem.findMany, na ordem. */
  readonly itemWheres: unknown[] = [];

  constructor(private readonly rows: PurchasePrismaRows) {}

  asPrisma(): PrismaClient {
    return {
      vendorItemLink: { findMany: () => Promise.resolve(this.rows.links) },
      purchaseInvoiceItem: {
        findMany: (args: { where: unknown }) => this.findItems(args),
      },
      supplyCostHistory: {
        findMany: () => Promise.resolve(this.rows.history ?? []),
      },
    } as unknown as PrismaClient;
  }

  private findItems(args: { where: unknown }): Promise<unknown[]> {
    this.itemWheres.push(args.where);
    return Promise.resolve(this.rows.items);
  }
}
