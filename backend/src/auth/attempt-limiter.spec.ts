import { HttpException } from '@nestjs/common';
import { AttemptLimiter, type AttemptRule } from './attempt-limiter.js';
import { FakeClock } from './auth-fakes.fixture.js';

const MINUTE = 60_000;
const USER: AttemptRule = { key: 'login:caixa@10.0.0.2', maxFailures: 5 };
const DEVICE: AttemptRule = { key: 'aparelho:10.0.0.2', maxFailures: 20 };

const wrong = () => Promise.resolve(null);
const right = () => Promise.resolve('ok');

/** Status HTTP do erro, ou o resultado quando a tentativa não foi barrada. */
async function outcome(promise: Promise<string | null>): Promise<unknown> {
  try {
    return await promise;
  } catch (error) {
    return (error as HttpException).getStatus();
  }
}

async function failTimes(limiter: AttemptLimiter, times: number) {
  for (let i = 0; i < times; i++) await limiter.attempt([USER], wrong);
}

describe('AttemptLimiter', () => {
  it('4 erros ainda deixam tentar; o 5º trava por 5 min', async () => {
    const clock = new FakeClock();
    const limiter = new AttemptLimiter(clock.now);
    await failTimes(limiter, 4);
    expect(await outcome(limiter.attempt([USER], right))).toBe('ok');
    await failTimes(limiter, 5);
    await expect(limiter.attempt([USER], right)).rejects.toThrow(/5 min/);
    clock.ms = 5 * MINUTE;
    expect(await outcome(limiter.attempt([USER], right))).toBe('ok');
  });

  it('a trava cresce: 5, 15 e depois 60 min; um acerto volta ao começo', async () => {
    const clock = new FakeClock();
    const limiter = new AttemptLimiter(clock.now);
    for (const minutes of [5, 15, 60, 60]) {
      await failTimes(limiter, 5);
      await expect(limiter.attempt([USER], right)).rejects.toThrow(
        new RegExp(`${minutes} min`),
      );
      clock.ms += minutes * MINUTE;
    }
    await limiter.attempt([USER], right);
    await failTimes(limiter, 5);
    await expect(limiter.attempt([USER], right)).rejects.toThrow(/5 min/);
  });

  it('em paralelo, só o máximo de tentativas é conferido; o resto recebe 429', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    let checked = 0;
    const slowWrong = async () => {
      checked += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return null;
    };
    const results = await Promise.all(
      Array.from({ length: 40 }, () =>
        outcome(limiter.attempt([USER], slowWrong)),
      ),
    );
    expect(checked).toBe(5);
    expect(results.filter((status) => status === 429)).toHaveLength(35);
    expect(await outcome(limiter.attempt([USER], right))).toBe(429);
  });

  it('a tentativa que começou antes e erra por último fecha a trava, e ela fica', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    let finishLate: (value: null) => void = () => undefined;
    const late = limiter.attempt(
      [USER],
      () => new Promise<null>((resolve) => (finishLate = resolve)),
    );
    await failTimes(limiter, 4);
    finishLate(null);
    await late;
    expect(await outcome(limiter.attempt([USER], right))).toBe(429);
  });

  it('a trava de uma chave barra a tentativa inteira, sem contar nas outras', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    await failTimes(limiter, 5);
    expect(await outcome(limiter.attempt([USER, DEVICE], right))).toBe(429);
    const otherUser = { key: 'login:admin@10.0.0.2', maxFailures: 5 };
    expect(await outcome(limiter.attempt([otherUser, DEVICE], right))).toBe(
      'ok',
    );
  });

  it('um acerto zera todas as chaves da tentativa', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    for (let i = 0; i < 19; i++) await limiter.attempt([DEVICE], wrong);
    await limiter.attempt([USER, DEVICE], right);
    for (let i = 0; i < 19; i++) await limiter.attempt([DEVICE], wrong);
    expect(await outcome(limiter.attempt([DEVICE], right))).toBe('ok');
  });

  it('se a conferência falhar (banco fora), a vaga volta sem contar erro', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    const broken = () => Promise.reject(new Error('banco fora'));
    for (let i = 0; i < 10; i++)
      await expect(limiter.attempt([USER], broken)).rejects.toThrow(
        'banco fora',
      );
    expect(await outcome(limiter.attempt([USER], right))).toBe('ok');
    expect(limiter.size).toBe(0);
  });

  it('chaves sem erro há 24 h somem quando o mapa chega ao teto', async () => {
    const clock = new FakeClock();
    const limiter = new AttemptLimiter(clock.now, 10_000);
    for (let i = 0; i < 10_000; i++)
      await limiter.attempt([{ key: `login:u${i}@x`, maxFailures: 5 }], wrong);
    expect(limiter.size).toBe(10_000);
    clock.ms = 24 * 60 * MINUTE;
    await limiter.attempt([USER], wrong);
    expect(limiter.size).toBe(1);
  });

  it('no teto, saem as mais antigas sem trava; uma trava em vigor fica', async () => {
    const limiter = new AttemptLimiter(new FakeClock().now, 3);
    await failTimes(limiter, 5);
    for (const name of ['a', 'b', 'c'])
      await limiter.attempt([{ key: name, maxFailures: 5 }], wrong);
    expect(limiter.size).toBeLessThanOrEqual(3);
    expect(await outcome(limiter.attempt([USER], right))).toBe(429);
  });
});
