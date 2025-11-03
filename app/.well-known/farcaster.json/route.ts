import { minikitConfig } from "../../../minikit.config";

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://farbase-phi.vercel.app";
}

export async function GET() {
  const base = getBaseUrl();

  const cfgFrame = (minikitConfig as any)?.frame ?? {};
  const frame = {
    name: cfgFrame.name ?? process.env.NEXT_PUBLIC_MINIAPP_NAME ?? "Farpedia",
    version: cfgFrame.version ?? process.env.NEXT_PUBLIC_MINIAPP_VERSION ?? "1",
    iconUrl: cfgFrame.iconUrl ?? process.env.NEXT_PUBLIC_ICON_URL ?? `${base}/icon.png`,
    homeUrl: cfgFrame.homeUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_URL ?? base,
    primaryCategory: cfgFrame.primaryCategory ?? process.env.NEXT_PUBLIC_PRIMARY_CATEGORY ?? "utility",
    description: cfgFrame.description ?? process.env.NEXT_PUBLIC_DESCRIPTION ?? "Farcaster/base wiki",
    subtitle: cfgFrame.subtitle ?? process.env.NEXT_PUBLIC_SUBTITLE ?? "Farcaster/base wiki",
    heroImageUrl: cfgFrame.heroImageUrl ?? process.env.NEXT_PUBLIC_HERO_URL ?? `${base}/hero.png`,
    splashImageUrl: cfgFrame.splashImageUrl ?? process.env.NEXT_PUBLIC_SPLASH_URL ?? `${base}/splash.png`,
    splashBackgroundColor: cfgFrame.splashBackgroundColor ?? process.env.NEXT_PUBLIC_SPLASH_BG ?? "#000000",
    tagline: cfgFrame.tagline ?? process.env.NEXT_PUBLIC_TAGLINE ?? "farcaster and base app wiki",
    buttonTitle: cfgFrame.buttonTitle ?? process.env.NEXT_PUBLIC_BUTTON_TITLE ?? "Farpedia",
    ogTitle: cfgFrame.ogTitle ?? process.env.NEXT_PUBLIC_OG_TITLE ?? "Farpadia - farcaster base wiki",
    ogDescription: cfgFrame.ogDescription ?? process.env.NEXT_PUBLIC_OG_DESCRIPTION ?? "farcaster and base app wiki",
    ogImageUrl: cfgFrame.ogImageUrl ?? process.env.NEXT_PUBLIC_OG_IMAGE ?? `${base}/hero.png`,
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
