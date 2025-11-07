"use client";

import { useState, useEffect } from "react";
import { useQuickAuth } from "@coinbase/onchainkit/minikit";

interface ArticleEdit {
  id: string;
  article_id: string;
  author_fid: string;
  body: string;
  approved: boolean;
  created_at: string;
}

interface ApproveButtonProps {
  articleId: string;
  articleSlug: string;
}

export function ApproveButton({ articleSlug }: ApproveButtonProps) {
  const { data: authData } = useQuickAuth<{ userFid: number }>("/api/auth");
  const [edits, setEdits] = useState<ArticleEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function fetchEdits() {
      try {
        const resp = await fetch(`/api/articles/${articleSlug}/edits`);
        if (resp.ok) {
          const data = await resp.json();
          setEdits(data.edits || []);
        }
      } catch (err) {
        console.error("Failed to fetch edits:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEdits();
  }, [articleSlug]);

  const handleApprove = async (editId: string) => {
    if (!authData?.userFid) return;
    
    setApproving(true);
    try {
      const resp = await fetch(`/api/articles/${articleSlug}/edits/${editId}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("quickAuthToken")}`,
        },
      });

      if (resp.ok) {
        alert("Edit approved! Points awarded.");
        // Refresh the page to show updated content
        window.location.reload();
      } else {
        const error = await resp.json();
        alert(`Failed to approve: ${error.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to approve edit:", err);
      alert("Failed to approve edit");
    } finally {
      setApproving(false);
    }
  };

  if (loading || edits.length === 0) return null;

  const pendingEdits = edits.filter(e => !e.approved);
  if (pendingEdits.length === 0) return null;

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
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)', marginBottom: 8 }}>
            Created {new Date(edit.created_at).toLocaleDateString()}
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
            {approving ? 'Approving...' : '✓ Approve & Award Points'}
          </button>
        </div>
      ))}
    </div>
  );
}
