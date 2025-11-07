import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import Link from "next/link";
import Image from "next/image";

// Use a loose prop signature to satisfy Next.js PageProps constraints in the app router
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ArticleViewPage(props: any) {
  const slug = props?.params?.slug ?? "";

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const url = `${SUPABASE_URL}/rest/v1/articles?select=*,mini_app_link&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    // server-side rendering: revalidate every 60 seconds
    next: { revalidate: 60 },
  });

  if (!resp.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Article: {slug}</h1>
        <p>Failed to load article.</p>
      </div>
    );
  }

  const rows = await resp.json();
  const article = Array.isArray(rows) ? rows[0] : rows;

  if (!article) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Article not found</h1>
        <p>{`No article with slug "${slug}" was found.`}</p>
      </div>
    );
  }

  // Fetch author username from Neynar
  let authorUsername = `FID ${article.author_fid}`;
  let authorPfp = null;
  if (NEYNAR_API_KEY && article.author_fid) {
    try {
      const neynarResp = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${article.author_fid}`,
        {
          headers: { 'x-api-key': NEYNAR_API_KEY },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );
      if (neynarResp.ok) {
        const data = await neynarResp.json();
        if (data.users && data.users.length > 0) {
          const user = data.users[0];
          authorUsername = user.username || user.display_name || authorUsername;
          authorPfp = user.pfp_url;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch author from Neynar:', err);
    }
  }

  // Fetch point total for author
  let authorPoints = 0;
  try {
    const ptsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_points?select=total_points&fid=eq.${article.author_fid}&limit=1`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        next: { revalidate: 60 },
      }
    );
    if (ptsResp.ok) {
      const ptsRows = await ptsResp.json();
      if (Array.isArray(ptsRows) && ptsRows.length > 0) {
        authorPoints = Number(ptsRows[0].total_points || 0);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch author points:', e);
  }

  const category = article.metadata?.category || 'article';
  const tokenAddress = article.metadata?.tokenAddress;
  const launcher = article.metadata?.launcher;

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      padding: '24px 20px',
    }}>
      {/* Header with back button */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/" style={{ 
          color: 'var(--foreground)', 
          textDecoration: 'none',
          fontSize: 14,
          opacity: 0.7,
        }}>
          ← Back
        </Link>
      </div>

      {/* Category badge */}
      {category && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ 
            display: 'inline-block',
            padding: '6px 12px',
            background: category === 'token' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: category === 'token' ? 'rgb(139, 92, 246)' : 'rgb(59, 130, 246)',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}>
            {category === 'token' ? '🪙 Token' : '📝 Project'}
          </span>
        </div>
      )}

      {/* Title and Launch Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: 20,
        marginBottom: 24
      }}>
        <h1 style={{ 
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.2,
          flex: 1,
        }}>
          {article.title}
        </h1>
        
        {/* Launch button - shown if mini_app_link exists */}
        {article.mini_app_link && (
          <a
            href={article.mini_app_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 24px',
              background: 'var(--foreground)',
              color: 'var(--background)',
              textDecoration: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s',
              marginTop: 4
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            🚀 Launch {article.title}
          </a>
        )}
      </div>

      {/* Author info */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: '1px solid var(--border-color, #e5e7eb)',
      }}>
        {authorPfp && (
            <Image 
            src={authorPfp} 
            alt={authorUsername}
              width={40}
              height={40}
            style={{ 
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
        <div>
          <div style={{ 
            fontSize: 14,
            color: 'var(--text-secondary, #666)',
          }}>
            By <strong style={{ color: 'var(--foreground)' }}>@{authorUsername}</strong>
          </div>
          <div style={{ 
            fontSize: 13,
            color: 'var(--text-secondary, #999)',
          }}>
            {new Date(article.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {authorPoints > 0 && ` · ${authorPoints} points`}
          </div>
        </div>
      </div>

      {/* Token metadata if applicable */}
      {category === 'token' && (tokenAddress || launcher) && (
        <div style={{
          marginBottom: 32,
          padding: 16,
          background: 'var(--card-bg, #f9fafb)',
          borderRadius: 8,
          border: '1px solid var(--border-color, #e5e7eb)',
        }}>
          {launcher && (
            <div style={{ marginBottom: tokenAddress ? 8 : 0 }}>
              <strong>Launcher:</strong> {launcher.charAt(0).toUpperCase() + launcher.slice(1)}
            </div>
          )}
          {tokenAddress && (
            <div style={{ 
              fontSize: 13,
              wordBreak: 'break-all',
            }}>
              <strong>Contract:</strong> <code>{tokenAddress}</code>
            </div>
          )}
        </div>
      )}

      {/* Article body */}
      <article style={{
        fontSize: 16,
        lineHeight: 1.7,
        color: 'var(--foreground)',
      }}>
        <ReactMarkdown 
          rehypePlugins={[rehypeSanitize]}
          components={{
              h1: ({node: _node, ...props}) => <h2 style={{ fontWeight: 700, marginTop: 32, marginBottom: 16 }} {...props} />,
              h2: ({node: _node, ...props}) => <h3 style={{ fontWeight: 700, marginTop: 24, marginBottom: 12 }} {...props} />,
              h3: ({node: _node, ...props}) => <h4 style={{ fontWeight: 600, marginTop: 20, marginBottom: 10 }} {...props} />,
              p: ({node: _node, ...props}) => <p style={{ marginBottom: 16 }} {...props} />,
              strong: ({node: _node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
          }}
        >
          {String(article.body)}
        </ReactMarkdown>
      </article>
    </div>
  );
}
