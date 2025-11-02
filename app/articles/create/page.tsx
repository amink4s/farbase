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
        This page allows creating a token/project article. For production, wire QuickAuth and attach the
        user fid to the <code>author_fid</code> field in the POST payload.
      </p>

  <ArticleForm />
    </div>
  );
}
