import { minikitConfig } from "../../../minikit.config";

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://farbase-phi.vercel.app";
}

export async function GET() {
  const base = getBaseUrl();

    const cfgFrame = (minikitConfig as unknown as { frame?: Record<string, unknown> })?.frame ?? {};

    // safe defaults for the manifest frame
    const defaultFrame: Record<string, string> = {
      name: "Farpedia",
      version: "1",
      iconUrl: `${base}/icon.png`,
      homeUrl: base,
      primaryCategory: "utility",
      description: "Farcaster/base wiki",
      subtitle: "Farpaster/base wiki",
      heroImageUrl: `${base}/hero.png`,
      splashImageUrl: `${base}/splash.png`,
      splashBackgroundColor: "#000000",
      tagline: "farcaster and base app wiki",
      buttonTitle: "Farpedia",
      ogTitle: "Farpadia - farcaster base wiki",
      ogDescription: "farcaster and base app wiki",
      ogImageUrl: `${base}/hero.png`,
    };

    // env overrides (prefixed with NEXT_PUBLIC_)
    const envFrame: Record<string, string | undefined> = {
      name: process.env.NEXT_PUBLIC_MINIAPP_NAME,
      version: process.env.NEXT_PUBLIC_MINIAPP_VERSION,
      iconUrl: process.env.NEXT_PUBLIC_ICON_URL,
      homeUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL,
      primaryCategory: process.env.NEXT_PUBLIC_PRIMARY_CATEGORY,
      description: process.env.NEXT_PUBLIC_DESCRIPTION,
      subtitle: process.env.NEXT_PUBLIC_SUBTITLE,
      heroImageUrl: process.env.NEXT_PUBLIC_HERO_URL,
      splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_URL,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BG,
      tagline: process.env.NEXT_PUBLIC_TAGLINE,
      buttonTitle: process.env.NEXT_PUBLIC_BUTTON_TITLE,
      ogTitle: process.env.NEXT_PUBLIC_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_OG_IMAGE,
    };

    // Compose final frame: prefer config (minikitConfig.frame) -> env overrides -> defaults
    const frame: Record<string, string> = {
      ...defaultFrame,
      ...Object.fromEntries(Object.entries(envFrame).filter(([, v]) => v !== undefined)) as Record<string, string>,
      ...Object.fromEntries(Object.entries(cfgFrame).filter(([, v]) => typeof v === "string")) as Record<string, string>,
    };

    // add a tiny debug object to help verify deployed output
    const debug = {
      generatedAt: new Date().toISOString(),
      source: Object.keys(cfgFrame).length > 0 ? "minikitConfig.frame" : "defaults/env",
    };

  const body = {
    accountAssociation: {
      header:
        "eyJmaWQiOjQ3NzEyNiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDIxOGE5YjU4QjkyOWRCRDBEOTEzMkFENEZlYzBkRkRCNzkyNDUyYkQifQ",
      payload: "eyJkb21haW4iOiJmYXJiYXNlLXBoaS52ZXJjZWwuYXBwIn0",
      signature:
        "4kyIU8gLozkwkRaKZMoPg0siwFqXB8uIYUqdyvg6be1r0WxPKNsJtgXyrKTMDf/fUdyvv1P1aUFssI8Pp5xWzRs=",
    },
    frame,
  };

  return Response.json(body);
}
