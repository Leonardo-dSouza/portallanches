import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password-hasher.js';
import { toNeighborhoodKey } from '../src/delivery/neighborhood-key.js';
import {
  DELIVERY_ZONES,
  EXPENSE_TYPE_NAMES,
  MOTOBOY_RATES,
  PAYMENT_METHOD_NAMES,
} from './seed-data.js';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/portallanches';

// Data antiga o bastante para valer para qualquer dia de fechamento existente.
const RATES_EFFECTIVE_FROM = new Date('2026-01-01');

async function seedUser(
  prisma: PrismaClient,
  username: string,
  role: Role,
  plainPassword: string,
): Promise<number> {
  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      name: username,
      username,
      role,
      passwordHash: hashPassword(plainPassword),
    },
  });
  return user.id;
}

async function seedPaymentMethods(prisma: PrismaClient): Promise<void> {
  for (const [index, name] of PAYMENT_METHOD_NAMES.entries()) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: index },
    });
  }
}

async function seedExpenseTypes(prisma: PrismaClient): Promise<void> {
  for (const name of EXPENSE_TYPE_NAMES) {
    const nameKey = toNeighborhoodKey(name);
    await prisma.expenseType.upsert({
      where: { nameKey },
      update: {},
      create: { name, nameKey },
    });
  }
}

async function seedDeliveryZones(prisma: PrismaClient): Promise<void> {
  for (const { neighborhood, fee } of DELIVERY_ZONES) {
    const neighborhoodKey = toNeighborhoodKey(neighborhood);
    await prisma.deliveryZone.upsert({
      where: { neighborhoodKey },
      update: {},
      create: { neighborhood, neighborhoodKey, fee },
    });
  }
}

async function seedMotoboyRates(
  prisma: PrismaClient,
  createdById: number,
): Promise<void> {
  for (const { dayGroup, amount } of MOTOBOY_RATES) {
    const effectiveFrom = RATES_EFFECTIVE_FROM;
    await prisma.motoboyRateSetting.upsert({
      where: { dayGroup_effectiveFrom: { dayGroup, effectiveFrom } },
      update: {},
      create: { dayGroup, amount, effectiveFrom, createdById },
    });
  }
}

/**
 * Usuários iniciais só nascem em banco sem administrador. Assim rodar o seed de novo
 * (ou em produção, depois de o admin trocar login e senha) nunca recria `admin/admin123`.
 * Senhas de desenvolvimento; em banco novo de produção defina SEED_*_PASSWORD.
 */
async function seedUsers(prisma: PrismaClient): Promise<number> {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { id: 'asc' },
  });
  if (existingAdmin) return existingAdmin.id;
  const adminId = await seedUser(
    prisma,
    'admin',
    Role.ADMIN,
    process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
  );
  await seedUser(
    prisma,
    'caixa',
    Role.CAIXA,
    process.env.SEED_CAIXA_PASSWORD ?? 'caixa123',
  );
  return adminId;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const adminId = await seedUsers(prisma);
    await seedPaymentMethods(prisma);
    await seedDeliveryZones(prisma);
    await seedExpenseTypes(prisma);
    await seedMotoboyRates(prisma, adminId);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
