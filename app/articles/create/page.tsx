"use client";

import ArticleForm from "../../../components/ArticleForm";
import Link from "next/link";
import { useState } from "react";

export default function CreateArticlePage() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: 'var(--foreground)',
            color: 'var(--background)',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 20,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ← Home
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Create Article</h1>
          {category ? (
            <span style={{ 
              background: category === "token" ? "rgba(139, 92, 246, 0.1)" : "rgba(59, 130, 246, 0.1)",
              color: category === "token" ? "rgb(139, 92, 246)" : "rgb(59, 130, 246)",
              padding: "6px 12px", 
              borderRadius: 6, 
              fontSize: 13,
              fontWeight: 600
            }}>
              {category === "token" ? "Token" : "Project"}
            </span>
          ) : null}
        </div>
      </header>

      <ArticleForm onCategoryChange={(c) => setCategory(c)} />
    </div>
  );
}
