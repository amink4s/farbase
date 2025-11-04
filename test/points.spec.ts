import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

vi.mock('@farcaster/quick-auth', () => ({
  createClient: () => ({ verifyJwt: async () => ({ sub: 'OWNER' }) }),
}));

// Ensure SUPABASE env vars for handler import
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

import handler from '../src/pages/api/articles/[slug]/edits/[id]/approve';

describe('Approve edit awards points', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('inserts contribution and creates user_points on first publication', async () => {
    // Mock fetch sequence:
    // 1) GET article by slug
    // 2) GET edit by id
    // 3) PATCH articles (apply edit)
    // 4) PATCH article_edits (mark approved)
    // 5) POST contributions
    // 6) GET user_points (none exists)
    // 7) POST user_points (insert)

    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ id: 'art-1', author_fid: 'OWNER', published: false }], status: 200 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ id: 'edit-1', author_fid: 'CONTRIB', body: 'hello', title: 'T' }], status: 200 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ id: 'art-1', published: true }], status: 200 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ id: 'edit-1', approved: true }], status: 200 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ id: 'c1' }], status: 201 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [], status: 200 }))
      .mockImplementationOnce(async () => ({ ok: true, json: async () => [{ fid: 'CONTRIB', total_points: 50 }], status: 201 }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const req = createRequest({
      method: 'POST',
      url: '/api/articles/my-slug/edits/edit-1/approve',
      query: { slug: 'my-slug', id: 'edit-1' },
      headers: { Authorization: 'Bearer token' },
    });
    const res = createResponse();

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);

    // Inspect calls to ensure contributions and user_points were called
    const calls = (fetchMock as unknown as jest.Mock).mock.calls;
    // Find the contributions POST call
    const contribCall = calls.find((c: any[]) => String(c[0]).includes('/rest/v1/contributions'));
    expect(contribCall).toBeTruthy();
    const contribBody = JSON.parse(contribCall[1].body);
    expect(contribBody).toMatchObject({ fid: 'CONTRIB', points: 50 });

    const upsertCall = calls.find((c: any[]) => String(c[0]).includes('/rest/v1/user_points') && c[1] && c[1].method === 'POST');
    expect(upsertCall).toBeTruthy();
    const upsertBody = JSON.parse(upsertCall[1].body);
    expect(upsertBody).toMatchObject({ fid: 'CONTRIB', total_points: 50 });
  });
});
