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

  // Build the exact frame payload shape requested by Farcaster (map env/config/defaults)
  const frame = {
    version: String(process.env.NEXT_PUBLIC_MINIAPP_VERSION ?? cfgFrame.version ?? "1"),
    name: String(process.env.NEXT_PUBLIC_MINIAPP_NAME ?? cfgFrame.name ?? "Farpedia"),
    iconUrl: String(process.env.NEXT_PUBLIC_ICON_URL ?? cfgFrame.iconUrl ?? `${base}/icon.png`),
    homeUrl: String(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_URL ?? cfgFrame.homeUrl ?? base),
    imageUrl: String(process.env.NEXT_PUBLIC_IMAGE_URL ?? cfgFrame.imageUrl ?? `${base}/image.png`),
    buttonTitle: String(process.env.NEXT_PUBLIC_BUTTON_TITLE ?? cfgFrame.buttonTitle ?? "Farpedia"),
    splashImageUrl: String(process.env.NEXT_PUBLIC_SPLASH_URL ?? cfgFrame.splashImageUrl ?? `${base}/splash.png`),
    splashBackgroundColor: String(process.env.NEXT_PUBLIC_SPLASH_BG ?? cfgFrame.splashBackgroundColor ?? "#000000"),
    webhookUrl: String(process.env.NEXT_PUBLIC_WEBHOOK_URL ?? `${base}/api/webhook`),
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
