import Image from 'next/image';

type UserData = { username: string; display_name: string; pfp_url: string };

type Article = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  author_fid: number;
  created_at: string;
  author_username?: string;
  author_display_name?: string;
  author_pfp?: string;
  like_count?: number;
  flag_count?: number;
};

export default async function Page() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!NEYNAR_API_KEY) {
    throw new Error('Missing NEYNAR_API_KEY');
  }

  let articles: Article[] = [];

  try {
    const articlesResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?category=eq.token&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        next: { revalidate: 3600 }
      }
    );
    if (articlesResp.ok) {
      articles = await articlesResp.json();

      // Fetch author info from Neynar
      if (articles.length > 0) {
        const fids = [...new Set(articles.map(a => a.author_fid).filter(Boolean))];
        const neynarResp = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(',')}`,
          {
            headers: {
              accept: 'application/json',
              api_key: NEYNAR_API_KEY
            },
            next: { revalidate: 3600 }
          }
        );
        if (neynarResp.ok) {
          const neynarData = await neynarResp.json();
          const userMap = new Map<string, UserData>(
            neynarData.users?.map((u: { fid: number; username: string; display_name: string; pfp_url: string }) => 
              [String(u.fid), { username: u.username, display_name: u.display_name, pfp_url: u.pfp_url } as UserData]
            ) || []
          );
          articles = articles.map(a => {
            const user: UserData | undefined = userMap.get(String(a.author_fid));
            return user ? { ...a, author_username: user.username, author_display_name: user.display_name, author_pfp: user.pfp_url } : a;
          });
        }
      }

      // Fetch like/flag counts
      if (articles.length > 0) {
        const articleIds = articles.map(a => a.id);
        const [likesResp, flagsResp] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/article_likes?article_id=in.(${articleIds.join(',')})&select=article_id`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              },
              next: { revalidate: 60 }
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/article_flags?article_id=in.(${articleIds.join(',')})&select=article_id`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              },
              next: { revalidate: 60 }
            }
          )
        ]);

        if (likesResp.ok && flagsResp.ok) {
          const likes: { article_id: number }[] = await likesResp.json();
          const flags: { article_id: number }[] = await flagsResp.json();
          
          const likeCounts = new Map<number, number>();
          const flagCounts = new Map<number, number>();
          
          likes.forEach(l => likeCounts.set(l.article_id, (likeCounts.get(l.article_id) || 0) + 1));
          flags.forEach(f => flagCounts.set(f.article_id, (flagCounts.get(f.article_id) || 0) + 1));
          
          articles = articles.map(a => ({
            ...a,
            like_count: likeCounts.get(a.id) || 0,
            flag_count: flagCounts.get(a.id) || 0
          }));
        }
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
        {articles.map((article: Article) => (
          <a
            key={article.id}
            href={`/article/${article.slug}`}
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
                  {article.author_display_name || article.author_username || 'Unknown'}
                </div>
                {article.author_username && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    @{article.author_username}
                  </div>
                )}
              </div>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{article.title}</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{article.description}</p>
            
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
                {article.like_count || 0}👍 · {article.flag_count || 0}🚩
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
