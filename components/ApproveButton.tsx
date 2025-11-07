"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ArticleEdit {
  id: string;
  article_id: string;
  author_fid: string;
  author_username?: string;
  author_display_name?: string;
  author_pfp?: string;
  body: string;
  approved: boolean;
  created_at: string;
}

interface ApproveButtonProps {
  articleId: string;
  articleSlug: string;
  authData: {
    userFid: number;
    isAdmin?: boolean;
    isReviewer?: boolean;
  };
}

export function ApproveButton({ articleSlug, authData }: ApproveButtonProps) {
  const [edits, setEdits] = useState<ArticleEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  // Only show for admins or reviewers
  const canApprove = authData?.isAdmin || authData?.isReviewer;

  // Log auth state for debugging
  useEffect(() => {
    console.log('[ApproveButton] Auth data received:', {
      authData,
      userFid: authData?.userFid,
      isAdmin: authData?.isAdmin,
      isReviewer: authData?.isReviewer,
      canApprove,
    });
  }, [authData, canApprove]);

  useEffect(() => {
    async function fetchEditsWithAuthors() {
      try {
        console.log('[ApproveButton] Fetching edits for slug:', articleSlug);
        const resp = await fetch(`/api/articles/${articleSlug}/edits`);
        console.log('[ApproveButton] Fetch response status:', resp.status, resp.ok);
        
        if (resp.ok) {
          const data = await resp.json();
          const editsData = data.edits || [];
          console.log('[ApproveButton] Received edits:', editsData.length, editsData);
          
          // Fetch author info for each edit
          const editsWithAuthors = await Promise.all(
            editsData.map(async (edit: ArticleEdit) => {
              try {
                const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
                console.log('[ApproveButton] Neynar API key present:', !!apiKey);
                
                const neynarResp = await fetch(
                  `https://api.neynar.com/v2/farcaster/user/bulk?fids=${edit.author_fid}`,
                  {
                    headers: {
                      api_key: apiKey || "",
                    },
                  }
                );
                console.log('[ApproveButton] Neynar response for FID', edit.author_fid, ':', neynarResp.status);
                
                if (neynarResp.ok) {
                  const neynarData = await neynarResp.json();
                  const user = neynarData.users?.[0];
                  if (user) {
                    return {
                      ...edit,
                      author_username: user.username,
                      author_display_name: user.display_name,
                      author_pfp: user.pfp_url,
                    };
                  }
                }
              } catch (err) {
                console.warn("[ApproveButton] Failed to fetch author:", err);
              }
              return edit;
            })
          );
          
          console.log('[ApproveButton] Edits with authors:', editsWithAuthors);
          setEdits(editsWithAuthors);
        } else {
          console.error('[ApproveButton] Failed to fetch edits, status:', resp.status);
          const errorText = await resp.text();
          console.error('[ApproveButton] Error response:', errorText);
        }
      } catch (err) {
        console.error("[ApproveButton] Failed to fetch edits:", err);
      } finally {
        console.log('[ApproveButton] Finished loading, setting loading=false');
        setLoading(false);
      }
    }
    fetchEditsWithAuthors();
  }, [articleSlug]);

  const handleApprove = async (editId: string) => {
    console.log('[ApproveButton] Approve clicked for edit:', editId);
    
    setApproving(true);
    try {
      // Try to get token from localStorage - check common key names
      const token = localStorage.getItem("quickAuthToken") 
        || localStorage.getItem("fc_quickauth_token")
        || localStorage.getItem("minikit_token");
      
      console.log('[ApproveButton] Token found:', !!token);
      
      if (!token) {
        alert("Authentication token not found. Please refresh the page and try again.");
        setApproving(false);
        return;
      }
      
      console.log('[ApproveButton] Calling approve API...');
      const resp = await fetch(`/api/articles/${articleSlug}/edits/${editId}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log('[ApproveButton] API response:', resp.status, resp.ok);

      if (resp.ok) {
        alert("Edit approved! Points awarded.");
        // Refresh the page to show updated content
        window.location.reload();
      } else {
        const error = await resp.json();
        console.error('[ApproveButton] API error:', error);
        alert(`Failed to approve: ${error.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("[ApproveButton] Failed to approve edit:", err);
      alert("Failed to approve edit");
    } finally {
      setApproving(false);
    }
  };

  console.log('[ApproveButton] Render check - authData:', !!authData, 'loading:', loading, 'canApprove:', canApprove);

  // Auth data is required and passed as prop
  if (!authData) {
    console.log('[ApproveButton] No auth data provided');
    return null;
  }
  
  // Only show for admins or reviewers (this check is also done in parent, but double-check here)
  if (!canApprove) {
    console.log('[ApproveButton] User cannot approve. isAdmin:', authData.isAdmin, 'isReviewer:', authData.isReviewer);
    return null;
  }

  if (authData) {
    console.log('[ApproveButton] User can approve. isAdmin:', authData.isAdmin, 'isReviewer:', authData.isReviewer);
  }

  // Wait for edits to load
  if (loading) {
    console.log('[ApproveButton] Still loading edits...');
    return null;
  }

  console.log('[ApproveButton] All edits:', edits.length);

  // Filter to pending edits only
  const pendingEdits = edits.filter(e => !e.approved);
  console.log('[ApproveButton] Pending edits:', pendingEdits.length);
  
  if (pendingEdits.length === 0) {
    console.log('[ApproveButton] No pending edits, hiding button');
    return null;
  }

  return (
    <div style={{
      marginTop: 32,
      padding: 20,
      background: 'rgba(255, 193, 7, 0.1)',
      border: '2px solid rgba(255, 193, 7, 0.3)',
      borderRadius: 8,
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        ⚠️ Pending Edits ({pendingEdits.length})
      </h3>
      {pendingEdits.map(edit => (
        <div key={edit.id} style={{
          padding: 16,
          background: 'var(--background)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {edit.author_pfp && (
              <Image
                src={edit.author_pfp}
                alt={edit.author_display_name || 'Author'}
                width={32}
                height={32}
                style={{ borderRadius: '50%' }}
              />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {edit.author_display_name || edit.author_username || `FID ${edit.author_fid}`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)' }}>
                Created {new Date(edit.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, marginBottom: 12, maxHeight: 100, overflow: 'auto' }}>
            {edit.body.substring(0, 200)}...
          </div>
          <button
            onClick={() => handleApprove(edit.id)}
            disabled={approving}
            style={{
              padding: '10px 20px',
              background: 'rgb(34, 197, 94)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: approving ? 'not-allowed' : 'pointer',
              opacity: approving ? 0.6 : 1,
            }}
          >
            {approving ? 'Approving...' : '✓ Approve & Award Points (Author: 1000, You: 100)'}
          </button>
        </div>
      ))}
    </div>
  );
}
