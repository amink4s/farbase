import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

vi.mock('@farcaster/quick-auth', () => ({
  createClient: () => ({ verifyJwt: async () => ({ sub: 'F123' }) }),
}));

import handler from '../src/pages/api/webhook';

describe('Webhook API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing authorization', async () => {
    const req = createRequest({ method: 'POST' });
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
  });

  it('stores event when authorized', async () => {
    // Mock fetch to simulate successful Supabase insert
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{ id: 'uuid' }], status: 201 })));

    const req = createRequest({ method: 'POST', headers: { Authorization: 'Bearer token' }, body: { hello: 'world' } });
    const res = createResponse();

    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getData();
    expect(JSON.parse(data)).toHaveProperty('received', true);
  });
});
