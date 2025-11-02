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
    }
  };

  return Response.json(body);
}
