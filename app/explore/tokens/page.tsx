import ArticleListCard from '../../../components/ArticleListCard';

export const dynamic = 'force-dynamic';

type UserData = { username: string; display_name: string; pfp_url: string };
type NeynarUser = {
  fid: number | string;
  username: string;
  display_name?: string;
  pfp_url?: string;
  pfp?: { url?: string };
};
type Article = {
  slug: string;
  title: string;
  created_at: string;
  author_fid: string;
  metadata?: { category?: string };
  author_username?: string;
  author_display_name?: string;
  author_pfp?: string;
};

export default async function Page() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NEYNAR_API_KEY) {
    throw new Error('Missing required server environment variables');
  }

  let articles: Article[] = [];
  let counts: Record<string, { likes: number; flags: number }> = {};

  try {
    const articlesResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=slug,title,metadata,created_at,author_fid&published=eq.true&metadata->>category=eq.token&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        next: { revalidate: 120 },
      }
    );

    if (!articlesResp.ok) {
      const text = await articlesResp.text();
      console.error('Supabase articles error (tokens):', articlesResp.status, text);
      return (
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Token Articles</h1>
            <p>Failed to load articles.</p>
          </div>
        );
    }

    let rows: Article[] = await articlesResp.json();
    // Fallback: if no explicit token-tagged rows, show recent published articles
    if (!Array.isArray(rows) || rows.length === 0) {
      const fallbackResp = await fetch(
        `${SUPABASE_URL}/rest/v1/articles?select=slug,title,metadata,created_at,author_fid&published=eq.true&order=created_at.desc&limit=20`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          next: { revalidate: 60 },
        }
      );
      if (fallbackResp.ok) {
        rows = await fallbackResp.json();
      }
    }
    articles = rows || [];

    if (articles.length > 0) {
      const fids = Array.from(new Set(articles.map(a => a.author_fid).filter(Boolean)));
      const slugs = articles.map(a => a.slug);

      const [neynarResp, countsResp] = await Promise.all([
          fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(',')}`,
            { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY }, next: { revalidate: 600 } }
          ),
          fetch(`/api/articles/counts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
            cache: 'no-store',
          }),
        ]);

      if (neynarResp.ok) {
        const neynarData: { users?: NeynarUser[] } = await neynarResp.json();
        const userMap = new Map<string, UserData>(
          (neynarData.users ?? []).map((u) => [
            String(u.fid),
            {
              username: u.username,
              display_name: u.display_name ?? u.username,
              pfp_url: u.pfp_url ?? u.pfp?.url ?? '',
            },
          ])
        );
        articles = articles.map(a => {
          const u = userMap.get(String(a.author_fid));
          return u ? { ...a, author_username: u.username, author_display_name: u.display_name, author_pfp: u.pfp_url } : a;
        });
      }

      if (countsResp.ok) {
        const json = await countsResp.json();
        counts = json.counts || {};
      }
    }
  } catch (err) {
    console.error('Error fetching tokens:', err);
  }

  return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Token Articles</h1>
      {articles.length === 0 && <p>No token articles found.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 760 }}>
        {articles.map((article) => (
          <ArticleListCard
            key={article.slug}
            href={`/articles/${article.slug}`}
            title={article.title}
            authorDisplay={String(article.author_display_name || article.author_username || `FID ${article.author_fid}`)}
            authorPfp={article.author_pfp}
            createdAt={article.created_at}
            rightText={`${counts[article.slug]?.likes || 0}👍 · ${counts[article.slug]?.flags || 0}🚩`}
          />
        ))}
      </div>
    </div>
  );
}
