// import { withValidManifest } from "@coinbase/onchainkit/minikit";
// import { minikitConfig } from "../../../minikit.config";

export async function GET() {
  const body = {
    accountAssociation: {
      header:
        "eyJmaWQiOjQ3NzEyNiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDIxOGE5YjU4QjkyOWRCRDBEOTEzMkFENEZlYzBkRkRCNzkyNDUyYkQifQ",
      payload: "eyJkb21haW4iOiJmYXJiYXNlLXBoaS52ZXJjZWwuYXBwIn0",
      signature:
        "4kyIU8gLozkwkRaKZMoPg0siwFqXB8uIYUqdyvg6be1r0WxPKNsJtgXyrKTMDf/fUdyvv1P1aUFssI8Pp5xWzRs="
    },
    frame: {
      name: "Farpedia",
      version: "1",
      iconUrl: "https://farbase-phi.vercel.app/icon.png",
      homeUrl: "https://farbase-phi.vercel.app/",
      imageUrl: "https://farbase-phi.vercel.app/hero.png",
      primaryCategory: "utility",
      description: "wikipedia for farcaster and the base app ecosystems",
      subtitle: "Farcaster/base wiki",
      heroImageUrl: "https://farbase-phi.vercel.app/hero.png",
      splashImageUrl: "https://farbase-phi.vercel.app/splash.png",
      splashBackgroundColor: "#000000",
      tagline: "farcaster and base app wiki",
      buttonTitle: "Farpedia",
      ogTitle: "Farpadia - farcaster base wiki",
      ogDescription: "wikipedia for farcaster and the base app ecosystems",
      ogImageUrl: "https://farbase-phi.vercel.app/hero.png",
    },
  };

  return Response.json(body);
}
