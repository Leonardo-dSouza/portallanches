import { loginAttemptRules, managerAttemptRules } from './attempt-rules.js';

describe('chaves das tentativas', () => {
  it('login conta no usuário daquele aparelho (5) e no aparelho (20)', () => {
    expect(loginAttemptRules('caixa', '10.0.0.2')).toEqual([
      { key: 'login:caixa@10.0.0.2', maxFailures: 5 },
      { key: 'aparelho:10.0.0.2', maxFailures: 20 },
    ]);
  });

  it('a senha do admin divide o balde do aparelho com o login', () => {
    const [manager, device] = managerAttemptRules('10.0.0.2');
    expect(manager).toEqual({ key: 'gerente@10.0.0.2', maxFailures: 5 });
    expect(device).toEqual(loginAttemptRules('caixa', '10.0.0.2')[1]);
  });
});
