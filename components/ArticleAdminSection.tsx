"use client";

import { useQuickAuth } from "@coinbase/onchainkit/minikit";
import { ApproveButton } from "./ApproveButton";

interface ArticleAdminSectionProps {
  articleSlug: string;
  articleId: string;
}

/**
 * Client wrapper component that handles auth at the top level
 * and passes admin status down to child components
 */
export function ArticleAdminSection({ articleSlug, articleId }: ArticleAdminSectionProps) {
  const { data: authData } = useQuickAuth<{ 
    userFid: number; 
    isAdmin?: boolean; 
    isReviewer?: boolean 
  }>("/api/auth");

  console.log('[ArticleAdminSection] Auth data:', authData);

  // Only render approve button if user is admin or reviewer
  const canApprove = authData?.isAdmin || authData?.isReviewer;

  if (!canApprove) {
    console.log('[ArticleAdminSection] User cannot approve, hiding section');
    return null;
  }

  console.log('[ArticleAdminSection] User can approve, showing button');

  return <ApproveButton articleId={articleId} articleSlug={articleSlug} authData={authData} />;
}
