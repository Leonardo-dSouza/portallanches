import { SessionStore } from './session-store.js';
import { SessionUser } from './session-user.js';

const USER: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const TTL_MS = 1000;

describe('SessionStore', () => {
  let nowMs: number;
  let store: SessionStore;

  beforeEach(() => {
    nowMs = 0;
    store = new SessionStore(() => nowMs, TTL_MS);
  });

  it('encontra o usuário pelo token criado', () => {
    expect(store.find(store.create(USER))).toEqual(USER);
  });

  it('não encontra token desconhecido', () => {
    expect(store.find('inexistente')).toBeUndefined();
  });

  it('expira a sessão após o ttl', () => {
    const token = store.create(USER);
    nowMs = TTL_MS;
    expect(store.find(token)).toBeUndefined();
  });

  it('remove a sessão no logout', () => {
    const token = store.create(USER);
    store.delete(token);
    expect(store.find(token)).toBeUndefined();
  });
});
