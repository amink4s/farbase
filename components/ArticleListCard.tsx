import Image from 'next/image';
import Link from 'next/link';

type Props = {
  href: string;
  title: string;
  authorDisplay: string;
  authorPfp?: string;
  createdAt: string; // ISO string
  rightText?: string; // e.g., "12👍 · 1🚩"
  variant?: 'default' | 'featured';
};

export default function ArticleListCard({
  href,
  title,
  authorDisplay,
  authorPfp,
  createdAt,
  rightText,
  variant = 'default',
}: Props) {
  const dateStr = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const className = variant === 'featured' ? 'article-list-card article-list-card--featured' : 'article-list-card';

  return (
    <Link href={href} className={className} aria-label={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {authorPfp ? (
          <Image src={authorPfp} alt={authorDisplay || 'Author'} width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>by {authorDisplay} • {dateStr}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {rightText ? <span style={{ fontSize: 11, color: 'var(--text-secondary, #555)', fontWeight: 500 }}>{rightText}</span> : null}
      </div>
    </Link>
  );
}
