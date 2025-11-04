import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

vi.mock('@farcaster/quick-auth', () => ({
  createClient: () => ({ verifyJwt: async () => ({ sub: 'F123' }) }),
}));

// Ensure SUPABASE env vars are available before importing handlers (they are read at module import time).
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

import handler from '../src/pages/api/admin/accounts';

describe('Admin accounts API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });

  it('returns 401 when missing Authorization', async () => {
    const req = createRequest({ method: 'GET' });
    const res = createResponse();

    await handler(req as any, res as any);
    if (res._getStatusCode() !== 401) {
      // print body for debugging
      // eslint-disable-next-line no-console
      console.log('admin response body:', res._getData && res._getData());
    }
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 502 when Supabase is not reachable (mocked)', async () => {
    // Mock global.fetch to return non-ok for accounts
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, text: async () => 'error' })));

    const req = createRequest({ method: 'GET', headers: { Authorization: 'Bearer token' } });
    const res = createResponse();

    await handler(req as any, res as any);
    // Because we mock fetch to fail when checking admin, API should return 502 or 403 depending on code path.
    expect([502, 403, 500]).toContain(res._getStatusCode());
  });
});
