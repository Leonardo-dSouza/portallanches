import { extractBearerToken } from './bearer-token.js';

describe('extractBearerToken', () => {
  it('extrai o token de um header válido', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('retorna undefined sem header', () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
  });

  it('retorna undefined para esquema diferente de Bearer', () => {
    expect(extractBearerToken('Basic abc123')).toBeUndefined();
  });

  it('retorna undefined para Bearer sem token', () => {
    expect(extractBearerToken('Bearer')).toBeUndefined();
  });
});
