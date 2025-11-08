import React from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@farcaster/quick-auth";
import { headers } from "next/headers";
import { LikeFlagButtons } from "../../../components/LikeFlagButtons";
import { ShareButton } from "../../../components/ShareButton";
import { LaunchButton } from "../../../components/LaunchButton";
import { MarkdownRenderer } from "../../../components/MarkdownRenderer";
import { ArticleAdminSection } from "../../../components/ArticleAdminSection";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// generateMetadata removed temporarily to avoid type incompatibilities during CI build.
// We rely on the OG image endpoint at /api/og/article/[slug] and Next's default metadata.

// Use a loose prop signature to satisfy Next.js PageProps constraints in the app router
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ArticleViewPage(props: any) {
  const slug = props?.params?.slug ?? "";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  async function getArticle(slug: string) {
    const supabase = createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: article, error } = await supabase
      .from("articles")
      .select("*,mini_app_link")
      .eq("slug", slug)
      .limit(1)
      .single();

    return { article, error };
  }

  const { article, error: articleError } = await getArticle(slug);

  if (articleError || !article) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Article: {slug}</h1>
        <p>Failed to load article.</p>
        <p>{articleError?.message}</p>
      </div>
    );
  }

  // Fetch counts for likes and flags
  const [{ count: likeCount }, { count: flagCount }] = await Promise.all([
    createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("article_id", article.id),
    createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      .from("flags")
      .select("*", { count: "exact", head: true })
      .eq("article_id", article.id),
  ]);

  // Check if user has liked or flagged
  let hasLiked = false;
  let hasFlagged = false;
  let userFid: number | undefined = undefined;

  const headerList = await headers();
  const authorization = headerList.get("Authorization");
  const token = authorization?.replace("Bearer ", "");
  const appDomain = "farbase-phi.vercel.app";

  if (token) {
    try {
      // This is safe to instantiate here; it doesn't make a network call.
      const quickAuthClient = createClient();
      const payload = await quickAuthClient.verifyJwt({
        token,
        domain: appDomain,
      });
      userFid = payload.sub;
    } catch (error) {
      console.warn("Invalid QuickAuth token:", error);
    }
  }

  if (userFid) {
    const supabase = createSupabaseClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );
    const [{ data: likeData }, { data: flagData }] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("article_id", article.id)
        .eq("user_fid", userFid)
        .limit(1)
        .single(),
      supabase
        .from("flags")
        .select("id")
        .eq("article_id", article.id)
        .eq("user_fid", userFid)
        .limit(1)
        .single(),
    ]);
    hasLiked = !!likeData;
    hasFlagged = !!flagData;
  }

  // Fetch author username from Neynar
  let authorUsername = `FID ${article.author_fid}`;
  let authorPfp = null;
  if (NEYNAR_API_KEY && article.author_fid) {
    try {
      const neynarResp = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${article.author_fid}`,
        {
          headers: { "api_key": NEYNAR_API_KEY },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );
      if (neynarResp.ok) {
        const data = await neynarResp.json();
        if (data.users && data.users.length > 0) {
          const user = data.users[0];
          authorUsername =
            user.username || user.display_name || authorUsername;
          authorPfp = user.pfp_url;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch author from Neynar:", err);
    }
  }

  // Fetch point total for author
  let authorPoints = 0;
  try {
    const supabase = createSupabaseClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );
    const ptsResp = await supabase
      .from("user_points")
      .select("total_points")
      .eq("fid", article.author_fid)
      .limit(1)
      .single();

    if (ptsResp.data) {
      authorPoints = Number(ptsResp.data.total_points || 0);
    }
  } catch (e) {
    console.warn("Failed to fetch author points:", e);
  }

  const category = article.metadata?.category || "article";
  const tokenAddress = article.metadata?.tokenAddress;
  const launcher = article.metadata?.launcher;

  const headerHost = headerList.get("host");
  const protocol = headerHost?.startsWith("localhost") ? "http" : "https";
  const articleUrl = `${protocol}://${headerHost}/articles/${slug}`;

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      {/* Header with back button */}
      <div style={{ marginBottom: 32, display: "flex", gap: 12 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "var(--foreground)",
            color: "var(--background)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
          }}
        >
          ← Home
        </Link>
        <ShareButton articleUrl={articleUrl} articleTitle={article.title} />
      </div>

      {/* Category badge */}
      {category && (
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 12px",
              background:
                category === "token"
                  ? "rgba(139, 92, 246, 0.1)"
                  : "rgba(59, 130, 246, 0.1)",
              color:
                category === "token" ? "rgb(139, 92, 246)" : "rgb(59, 130, 246)",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {category === "token" ? "🪙 Token" : "📝 Project"}
          </span>
        </div>
      )}

      {/* Title and Launch Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.2,
            flex: 1,
          }}
        >
          {article.title}
        </h1>

        {/* Launch button - shown if mini_app_link exists */}
        {article.mini_app_link && (
          <LaunchButton href={article.mini_app_link} title={article.title} />
        )}
      </div>

      {/* Author and interaction info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "1px solid var(--border-color, #e5e7eb)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {authorPfp && (
            <Image
              src={authorPfp}
              alt={authorUsername}
              width={40}
              height={40}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary, #666)",
              }}
            >
              By{" "}
              <strong style={{ color: "var(--foreground)" }}>
                @{authorUsername}
              </strong>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary, #999)",
              }}
            >
              {new Date(article.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {authorPoints > 0 && ` · ${authorPoints} points`}
            </div>
          </div>
        </div>
        <LikeFlagButtons
          articleSlug={slug}
          initialLikes={likeCount ?? 0}
          initialFlags={flagCount ?? 0}
          hasLiked={hasLiked}
          hasFlagged={hasFlagged}
        />
      </div>

      {/* Main content */}
      <div style={{ fontSize: "1.1rem", lineHeight: 1.7 }}>
        <MarkdownRenderer content={article.body} />
      </div>

      {/* Admin section for vetting */}
      <ArticleAdminSection articleId={article.id} articleSlug={slug} />
    </div>
  );
}
