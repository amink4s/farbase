import ArticleForm from "../../../components/ArticleForm";
import Link from "next/link";

export default function CreateArticlePage() {
  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Create Article</h1>
        <Link href="/">← Home</Link>
      </header>

      <p>
        This page allows creating a token/project article. For production, QuickAuth is used so the server
  can verify the author FID. Note: publishing is currently restricted to high-quality authors —
        new articles are only accepted when the server-side Neynar moderation score is &gt; 0.7.
      </p>

  <ArticleForm />
    </div>
  );
}
