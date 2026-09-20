import { ConflictException, NotFoundException } from '@nestjs/common';
import { mapPrismaError } from './prisma-error.js';

describe('mapPrismaError', () => {
  it('P2002 vira 409 citando a coluna', () => {
    const error = mapPrismaError({
      code: 'P2002',
      meta: { target: ['username'] },
    });
    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toContain('username');
  });

  it('P2002 com driver adapter cita a restrição violada', () => {
    const error = mapPrismaError({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'payment_methods_name_key' } },
        },
      },
    });
    expect(error?.message).toContain('payment_methods_name_key');
  });

  it('P2025 vira 404', () => {
    expect(mapPrismaError({ code: 'P2025' })).toBeInstanceOf(NotFoundException);
  });

  it('ignora outros erros', () => {
    expect(mapPrismaError({ code: 'P9999' })).toBeUndefined();
    expect(mapPrismaError(new Error('x'))).toBeUndefined();
    expect(mapPrismaError(null)).toBeUndefined();
  });
});
