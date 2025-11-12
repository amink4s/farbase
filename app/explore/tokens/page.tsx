import Image from 'next/image';

type UserData = { username: string; display_name: string; pfp_url: string };
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

    const rows: Article[] = await articlesResp.json();
    articles = rows;

    if (articles.length > 0) {
      const fids = Array.from(new Set(articles.map(a => a.author_fid).filter(Boolean)));
      const slugs = articles.map(a => a.slug);

      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
      const [neynarResp, countsResp] = await Promise.all([
          fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(',')}`,
            { headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY }, next: { revalidate: 600 } }
          ),
          fetch(`${baseUrl}/api/articles/counts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
            cache: 'no-store',
          }),
        ]);

      if (neynarResp.ok) {
        const neynarData = await neynarResp.json();
        const userMap = new Map<string, UserData>(
          (neynarData.users as any[] | undefined)?.map((u: any) => [String(u.fid), { username: u.username, display_name: u.display_name, pfp_url: u.pfp_url }]) || []
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {articles.map((article) => (
            <a
            key={article.slug}
              href={`/articles/${article.slug}`}
            style={{
                display: 'block',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s',
                cursor: 'pointer'
              }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                {article.author_pfp && (
                <Image
                    src={article.author_pfp}
                    alt={article.author_username || 'Author'}
                    width={40}
                    height={40}
                    style={{ borderRadius: '50%' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                  {article.author_display_name || article.author_username || `FID ${article.author_fid}`}
                  </div>
                  {article.author_username && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    @{article.author_username}
                  </div>
                  )}
                </div>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{article.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
              <span
                style={{
                    backgroundColor: '#9333ea',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
              >
                token
              </span>
              <span style={{ color: '#666' }}>
                {(counts[article.slug]?.likes || 0)}👍 · {(counts[article.slug]?.flags || 0)}🚩
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
