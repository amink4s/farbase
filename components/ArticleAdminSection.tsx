"use client";

import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
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

  // Get user FID from MiniKit context
  const mini = useMiniKit();
  const rawUser = mini?.context?.user as unknown | undefined;
  const user = typeof rawUser === 'object' && rawUser !== null ? (rawUser as Record<string, unknown>) : undefined;
  const userFid = user?.['fid'] ? Number(user['fid']) : undefined;

  console.log('[ArticleAdminSection] User from MiniKit:', { user, userFid });

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

  // Don't show if no user FID available
  if (!userFid) {
    console.log('[ArticleAdminSection] No user FID available from MiniKit');
    return null;
  }

  // Only show if there are pending edits
  if (loading || !hasPendingEdits) {
    return null;
  }

  // Pass real user FID - server will verify admin/reviewer status
  const authData = { userFid, isAdmin: true, isReviewer: false };

  return <ApproveButton articleId={articleId} articleSlug={articleSlug} authData={authData} />;
}
