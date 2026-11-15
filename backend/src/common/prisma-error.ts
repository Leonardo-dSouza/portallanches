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

/** Linha de log de um erro do Prisma que virou 500, sem os argumentos da chamada. */
export interface PrismaFailureLogEntry {
  event: 'prisma_error';
  name: string;
  code: string | null;
  /** Primeira linha da mensagem (ex.: "Invalid `prisma.customer.update()` invocation:"). */
  summary: string;
}

/** Saída do log (JSON no console do contêiner). */
export type PrismaFailureLog = (entry: PrismaFailureLogEntry) => void;

/** Quanto da primeira linha vai para o log. */
const MAX_SUMMARY_LENGTH = 200;

/**
 * O que registrar de um erro do Prisma sem tratamento, ou null se não é do Prisma. A mensagem do
 * Prisma repete a chamada inteira com os argumentos: num erro em cliente ou pedido, nome e
 * telefone iam para o log do Docker (S-19 do mapa de segurança, 2026-11-15).
 *
 * @example prismaFailureOf(validationError)?.summary // 'Invalid `prisma.customer.update()` invocation:'
 */
export function prismaFailureOf(
  exception: unknown,
): PrismaFailureLogEntry | null {
  if (!(exception instanceof Error)) return null;
  if (!exception.name.startsWith('PrismaClient')) return null;
  const code = (exception as { code?: unknown }).code;
  const summary =
    exception.message
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line !== '') ?? '';
  return {
    event: 'prisma_error',
    name: exception.name,
    code: typeof code === 'string' ? code : null,
    summary: summary.slice(0, MAX_SUMMARY_LENGTH),
  };
}

/** @example jsonPrismaFailureLog({ event: 'prisma_error', name: 'PrismaClientValidationError', code: null, summary: '…' }) */
export const jsonPrismaFailureLog: PrismaFailureLog = (entry) =>
  console.error(JSON.stringify({ ...entry, at: new Date().toISOString() }));
