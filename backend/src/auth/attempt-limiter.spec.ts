import { HttpException } from '@nestjs/common';
import { AttemptLimiter } from './attempt-limiter.js';

/** Relógio que o teste empurra. */
class FakeClock {
  ms = 0;
  readonly now = () => this.ms;
}

function failTimes(limiter: AttemptLimiter, key: string, times: number) {
  for (let i = 0; i < times; i++) limiter.recordFailure(key);
}

describe('AttemptLimiter', () => {
  it('4 erros ainda deixam tentar; o 5º trava por 5 min', () => {
    const clock = new FakeClock();
    const limiter = new AttemptLimiter(clock.now);
    failTimes(limiter, 'login:caixa', 4);
    expect(() => limiter.assertAllowed('login:caixa')).not.toThrow();
    limiter.recordFailure('login:caixa');
    expect(() => limiter.assertAllowed('login:caixa')).toThrow(
      /"login:caixa".*5 min/,
    );
    clock.ms = 5 * 60 * 1000;
    expect(() => limiter.assertAllowed('login:caixa')).not.toThrow();
  });

  it('a trava é 429 e só vale para a chave que errou', () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    failTimes(limiter, 'manager', 5);
    try {
      limiter.assertAllowed('manager');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(() => limiter.assertAllowed('login:admin')).not.toThrow();
  });

  it('um acerto zera a contagem', () => {
    const limiter = new AttemptLimiter(new FakeClock().now);
    failTimes(limiter, 'login:caixa', 4);
    limiter.recordSuccess('login:caixa');
    failTimes(limiter, 'login:caixa', 4);
    expect(() => limiter.assertAllowed('login:caixa')).not.toThrow();
  });
});
