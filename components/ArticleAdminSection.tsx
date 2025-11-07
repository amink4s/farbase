"use client";

import { useState, useEffect } from "react";
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

  const [fallbackAuthData, setFallbackAuthData] = useState<{ userFid: number; isAdmin?: boolean; isReviewer?: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fallback: If useQuickAuth doesn't work, try to fetch auth data directly
  useEffect(() => {
    if (authData) {
      console.log('[ArticleAdminSection] Auth data from useQuickAuth:', authData);
      setAuthLoading(false);
      return;
    }

    // Wait a bit for useQuickAuth to load
    const timer = setTimeout(async () => {
      if (!authData) {
        console.log('[ArticleAdminSection] useQuickAuth not loading, trying fallback...');
        
        // Check all possible token keys
        const possibleKeys = ['quickAuthToken', 'fc_quickauth_token', 'minikit_token', 'farcaster_token'];
        let token = null;
        
        for (const key of possibleKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(`[ArticleAdminSection] Found token with key: ${key}`);
            token = value;
            break;
          }
        }
        
        // Log all localStorage keys for debugging
        console.log('[ArticleAdminSection] All localStorage keys:', Object.keys(localStorage));
        
        if (token) {
          try {
            const resp = await fetch('/api/auth', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (resp.ok) {
              const data = await resp.json();
              console.log('[ArticleAdminSection] Fallback auth data:', data);
              setFallbackAuthData(data);
            }
          } catch (err) {
            console.error('[ArticleAdminSection] Fallback auth failed:', err);
          }
        } else {
          console.log('[ArticleAdminSection] No auth token found in localStorage');
        }
        setAuthLoading(false);
      }
    }, 2000); // Wait 2 seconds for useQuickAuth

    return () => clearTimeout(timer);
  }, [authData]);

  const effectiveAuthData = authData || fallbackAuthData;

  console.log('[ArticleAdminSection] Effective auth data:', effectiveAuthData, 'loading:', authLoading);

  // Wait for auth to load
  if (authLoading && !effectiveAuthData) {
    console.log('[ArticleAdminSection] Waiting for auth...');
    return null;
  }

  // Only render approve button if user is admin or reviewer
  const canApprove = effectiveAuthData?.isAdmin || effectiveAuthData?.isReviewer;

  if (!canApprove) {
    console.log('[ArticleAdminSection] User cannot approve, hiding section. Auth:', effectiveAuthData);
    return null;
  }

  console.log('[ArticleAdminSection] User can approve, showing button');

  return <ApproveButton articleId={articleId} articleSlug={articleSlug} authData={effectiveAuthData} />;
}
