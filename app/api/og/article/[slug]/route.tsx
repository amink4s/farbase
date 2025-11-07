import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const neynarApiKey = process.env.NEYNAR_API_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL is not set.");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
if (!neynarApiKey) throw new Error("NEYNAR_API_KEY is not set.");

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;

  try {
    // 1. Fetch article data from Supabase
    const articleUrl = `${supabaseUrl}/rest/v1/articles?select=title,author_fid,image_url&slug=eq.${encodeURIComponent(
      slug
    )}&limit=1`;
    const articleResponse = await fetch(articleUrl, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      } as HeadersInit,
    });

    if (!articleResponse.ok) {
      const errorText = await articleResponse.text();
      return new Response(`Article not found: ${errorText}`, { status: 404 });
    }

    const articles = await articleResponse.json();
    const article = articles[0];

    if (!article) {
      return new Response(`Article not found`, { status: 404 });
    }

    const { title, author_fid, image_url } = article;

    // 2. Fetch author data from Neynar
    const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${author_fid}`, {
      headers: {
        api_key: neynarApiKey,
      } as HeadersInit,
    });

    if (!neynarResponse.ok) {
      console.error("Neynar API error:", await neynarResponse.text());
      return new Response("Failed to fetch author data", { status: 500 });
    }

    const neynarData = await neynarResponse.json();
    const author = neynarData.users[0];
    const authorName = author?.display_name || "Anonymous";
    const authorPfp = author?.pfp_url || "https://i.imgur.com/0v3QJ4h.png"; // A default PFP

    // Using a flex container to manage layout
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "black",
            color: "white",
            position: "relative",
          }}
        >
          {image_url && (
            <img
              src={image_url}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.3,
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 80px",
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: 60,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 40,
              }}
            >
              <img
                src={authorPfp}
                alt=""
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  marginRight: 20,
                }}
              />
              <span style={{ fontSize: 36, fontWeight: 500 }}>{authorName}</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "An unknown error occurred";
    return new Response(`Failed to generate image: ${message}`, { status: 500 });
  }
}
