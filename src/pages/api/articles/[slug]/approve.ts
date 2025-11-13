import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createQuickAuthClient, Errors } from '@farcaster/quick-auth';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !NEYNAR_API_KEY) {
  throw new Error('Missing required environment variables.');
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
const quickAuthClient = createQuickAuthClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  const host = req.headers.host || process.env.VERCEL_URL || undefined;
  if (!host) {
    return res.status(400).json({ error: 'Missing host/VERCEL_URL' });
  }

  try {
    // Verify admin via QuickAuth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }
    const payload = await quickAuthClient.verifyJwt({ token: authHeader.split(' ')[1], domain: host });
    const approverFid = String(payload.sub);
    if (!approverFid) return res.status(401).json({ error: 'Could not determine approver FID' });

    // Optional: check approver is admin
    const { data: acct } = await supabase.from('accounts').select('is_admin').eq('fid', approverFid).maybeSingle();
    if (!acct?.is_admin) {
      return res.status(403).json({ error: 'Approver is not admin' });
    }

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, author_fid, vetted')
      .eq('slug', slug)
      .single();
    if (articleError || !article) return res.status(404).json({ error: 'Article not found' });
    if (article.vetted) return res.status(200).json({ success: true, message: 'Already vetted' });

    // Call approval procedure
    const rpcResp = await supabase.rpc('approve_article_and_award', {
      article_slug: slug,
      approver_fid: approverFid,
    });
    if (rpcResp.error) {
      console.error('approve_article_and_award error:', rpcResp.error);
      return res.status(500).json({ error: 'Approval failed' });
    }

    return res.status(200).json({ success: true, message: 'Article approved', article_id: rpcResp.data?.[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Errors.InvalidTokenError) return res.status(401).json({ error: 'Invalid QuickAuth token' });
    console.error('Approve API error:', message);
    return res.status(500).json({ error: 'Internal server error', details: message });
  }
}
 
