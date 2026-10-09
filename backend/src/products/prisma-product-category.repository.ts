import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  CategoryData,
  CategoryRecord,
  ProductCategoryRepository,
} from './product-category-repository.js';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  nameKey: true,
  sortOrder: true,
  active: true,
} as const;

@Injectable()
export class PrismaProductCategoryRepository implements ProductCategoryRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  list(): Promise<CategoryRecord[]> {
    return this.prisma.productCategory.findMany({
      select: CATEGORY_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: number): Promise<CategoryRecord | null> {
    return this.prisma.productCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
  }

  create(data: CategoryData): Promise<CategoryRecord> {
    return this.prisma.productCategory.create({
      data,
      select: CATEGORY_SELECT,
    });
  }

  update(
    id: number,
    data: Omit<CategoryData, 'sortOrder'>,
  ): Promise<CategoryRecord> {
    return this.prisma.productCategory.update({
      where: { id },
      data,
      select: CATEGORY_SELECT,
    });
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.productCategory.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  }
}
