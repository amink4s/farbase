"use client";

import { useState, useEffect } from "react";
import { ApproveButton } from "./ApproveButton";

interface ArticleAdminSectionProps {
  articleSlug: string;
  articleId: string;
}

/**
 * Client wrapper component that shows admin controls.
 * Authorization is handled server-side by the API endpoints.
 */
export function ArticleAdminSection({ articleSlug, articleId }: ArticleAdminSectionProps) {
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if there are pending edits
  useEffect(() => {
    async function checkPendingEdits() {
      try {
        const resp = await fetch(`/api/articles/${articleSlug}/edits`);
        if (resp.ok) {
          const data = await resp.json();
          const edits = data.edits || [];
          const pending = edits.filter((e: { approved: boolean }) => !e.approved);
          setHasPendingEdits(pending.length > 0);
        }
      } catch (err) {
        console.error('[ArticleAdminSection] Failed to check edits:', err);
      } finally {
        setLoading(false);
      }
    }
    checkPendingEdits();
  }, [articleSlug]);

  // Only show if there are pending edits
  if (loading || !hasPendingEdits) {
    return null;
  }

  // Note: We pass a mock auth data object. The actual authorization
  // will be handled server-side when the approve button is clicked.
  const mockAuthData = { userFid: 0, isAdmin: true, isReviewer: false };

  return <ApproveButton articleId={articleId} articleSlug={articleSlug} authData={mockAuthData} />;
}
