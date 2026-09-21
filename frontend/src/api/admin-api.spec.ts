import type { ApiClient, HttpMethod } from './api-client';
import { createAdminApi } from './admin-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string }[] = [];

  async request<T>(method: HttpMethod, path: string) {
    this.calls.push({ method, path });
    return undefined as T;
  }
}

describe('createAdminApi', () => {
  it('pede o relatório do período com from e to na query', async () => {
    const api = new RecordingApiClient();
    await createAdminApi(api).periodReport({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(api.calls).toEqual([
      { method: 'GET', path: '/reports?from=2026-09-01&to=2026-09-30' },
    ]);
  });

  it('reabre e fecha o dia pela data', async () => {
    const api = new RecordingApiClient();
    const admin = createAdminApi(api);
    await admin.reopenDay('2026-09-22');
    await admin.closeDay('2026-09-20');
    expect(api.calls).toEqual([
      { method: 'POST', path: '/closings/2026-09-22/reopen' },
      { method: 'POST', path: '/closings/2026-09-20/close' },
    ]);
  });
});
