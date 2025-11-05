"use client";

import ArticleForm from "../../../components/ArticleForm";
import Link from "next/link";
import { useState } from "react";

export default function CreateArticlePage() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Create Article</h1>
          {category ? (
            <span style={{ background: "#eef", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
              {category === "token" ? "Tokens" : "Articles"}
            </span>
          ) : null}
        </div>
        <Link href="/">← Home</Link>
      </header>

      <ArticleForm onCategoryChange={(c) => setCategory(c)} />
    </div>
  );
}
