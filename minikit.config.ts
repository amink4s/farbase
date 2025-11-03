const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: "",
  },
  baseBuilder: {
    ownerAddress: "",
  },
  miniapp: {
    version: "1",
    name: "farpedia",
    subtitle: "",
    description: "",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "utility",
    tags: ["example"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
  frame: {
    name: process.env.NEXT_PUBLIC_MINIAPP_NAME ?? "Farpedia",
    version: process.env.NEXT_PUBLIC_MINIAPP_VERSION ?? "1",
    iconUrl: process.env.NEXT_PUBLIC_ICON_URL ?? `${ROOT_URL}/icon.png`,
    homeUrl: process.env.NEXT_PUBLIC_APP_URL ?? ROOT_URL,
    primaryCategory: process.env.NEXT_PUBLIC_PRIMARY_CATEGORY ?? "utility",
    description: process.env.NEXT_PUBLIC_DESCRIPTION ?? "Farcaster/base wiki",
    subtitle: process.env.NEXT_PUBLIC_SUBTITLE ?? "Farcaster/base wiki",
    heroImageUrl: process.env.NEXT_PUBLIC_HERO_URL ?? `${ROOT_URL}/hero.png`,
    splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_URL ?? `${ROOT_URL}/splash.png`,
    splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BG ?? "#000000",
    tagline: process.env.NEXT_PUBLIC_TAGLINE ?? "farcaster and base app wiki",
    buttonTitle: process.env.NEXT_PUBLIC_BUTTON_TITLE ?? "Farpedia",
    ogTitle: process.env.NEXT_PUBLIC_OG_TITLE ?? "Farpadia - farcaster base wiki",
    ogDescription: process.env.NEXT_PUBLIC_OG_DESCRIPTION ?? "farcaster and base app wiki",
    ogImageUrl: process.env.NEXT_PUBLIC_OG_IMAGE ?? `${ROOT_URL}/hero.png`,
  },
} as const;
