import ArticleForm from "../../../components/ArticleForm";
import Link from "next/link";

export default function CreateArticlePage() {
  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Create Article</h1>
        <Link href="/">← Home</Link>
      </header>

  <ArticleForm />
    </div>
  );
}
