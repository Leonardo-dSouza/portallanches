import { ConflictException, NotFoundException } from '@nestjs/common';

interface PrismaLikeError {
  code: string;
  meta?: {
    target?: unknown;
    // Com o driver adapter (Prisma 7) o alvo vem aqui e `target` fica vazio.
    driverAdapterError?: {
      cause?: { constraint?: { fields?: unknown; index?: unknown } };
    };
  };
}

const isPrismaLikeError = (error: unknown): error is PrismaLikeError =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as PrismaLikeError).code === 'string';

function uniqueTarget(error: PrismaLikeError): string {
  const constraint = error.meta?.driverAdapterError?.cause?.constraint;
  const target = error.meta?.target ?? constraint?.fields ?? constraint?.index;
  return JSON.stringify(target ?? 'desconhecido');
}

/**
 * Traduz erros conhecidos do Prisma para respostas HTTP: valor duplicado em coluna
 * única (P2002) vira 409 e registro inexistente em update/delete (P2025) vira 404.
 * Devolve undefined para qualquer outro erro, que segue o tratamento padrão.
 */
export function mapPrismaError(error: unknown): Error | undefined {
  if (!isPrismaLikeError(error)) return undefined;
  if (error.code === 'P2002') {
    return new ConflictException(
      `Já existe um registro com o mesmo valor em ${uniqueTarget(error)}: esperado um valor único`,
    );
  }
  if (error.code === 'P2025') {
    return new NotFoundException(
      'Registro não encontrado para a operação pedida',
    );
  }
  return undefined;
}
