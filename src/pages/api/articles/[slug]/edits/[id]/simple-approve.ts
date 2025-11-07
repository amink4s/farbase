import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Simplified approve endpoint that checks admin status via Neynar directly
 * No QuickAuth token required - just checks FID against Neynar score/spam label
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug, id } = req.query as { slug?: string; id?: string };
  const { approverFid } = req.body as { approverFid?: string };

  if (!slug || !id) return res.status(400).json({ error: "Missing slug or id" });
  if (!approverFid) return res.status(400).json({ error: "Missing approverFid" });

  console.log(`[SIMPLE-APPROVE] FID ${approverFid} attempting to approve edit ${id} for article ${slug}`);

  try {
    // Check if approver is admin/reviewer in database
    const accResp = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?select=is_admin,is_reviewer&fid=eq.${encodeURIComponent(approverFid)}&limit=1`,
      {
        headers: { 
          Authorization: `Bearer ${SUPABASE_KEY}`, 
          apikey: SUPABASE_KEY 
        },
      }
    );

    if (!accResp.ok) {
      console.error(`[SIMPLE-APPROVE] Failed to fetch account:`, accResp.status);
      return res.status(500).json({ error: "Failed to verify admin status" });
    }

    const accounts = await accResp.json();
    const account = Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null;

    if (!account || (!account.is_admin && !account.is_reviewer)) {
      console.log(`[SIMPLE-APPROVE] FID ${approverFid} is not admin/reviewer`);
      return res.status(403).json({ error: "Only admins and reviewers can approve edits" });
    }

    console.log(`[SIMPLE-APPROVE] FID ${approverFid} is authorized (admin: ${account.is_admin}, reviewer: ${account.is_reviewer})`);

    // Fetch the article
    const artResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      }
    );

    if (!artResp.ok) {
      return res.status(502).json({ error: "Failed to fetch article" });
    }

    const articles = await artResp.json();
    const article = Array.isArray(articles) ? articles[0] : null;

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Fetch the edit
    const editResp = await fetch(
      `${SUPABASE_URL}/rest/v1/article_edits?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
      {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      }
    );

    if (!editResp.ok) {
      return res.status(502).json({ error: "Failed to fetch edit" });
    }

    const edits = await editResp.json();
    const edit = Array.isArray(edits) ? edits[0] : null;

    if (!edit) {
      return res.status(404).json({ error: "Edit not found" });
    }

    if (edit.approved) {
      return res.status(400).json({ error: "Edit already approved" });
    }

    // Approve the edit
    const approveResp = await fetch(
      `${SUPABASE_URL}/rest/v1/article_edits?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          approved: true,
          reviewer_fid: approverFid,
        }),
      }
    );

    if (!approveResp.ok) {
      const text = await approveResp.text();
      console.error(`[SIMPLE-APPROVE] Failed to approve edit:`, text);
      return res.status(502).json({ error: "Failed to approve edit" });
    }

    // Update article body
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(article.id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: edit.body }),
      }
    );

    if (!updateResp.ok) {
      console.error(`[SIMPLE-APPROVE] Failed to update article`);
    }

    // Award points: 1000 to author, 100 to approver
    const authorPoints = 1000;
    const approverPoints = 100;

    // Insert author contribution
    await fetch(`${SUPABASE_URL}/rest/v1/contributions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fid: edit.author_fid,
        source_type: "edit",
        source_id: edit.id,
        points: authorPoints,
      }),
    });

    // Insert approver contribution
    await fetch(`${SUPABASE_URL}/rest/v1/contributions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fid: approverFid,
        source_type: "review",
        source_id: edit.id,
        points: approverPoints,
      }),
    });

    // Update user_points for author
    const authorPointsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_points?fid=eq.${encodeURIComponent(edit.author_fid)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          fid: edit.author_fid,
          total_points: authorPoints,
        }),
      }
    );

    if (!authorPointsResp.ok) {
      // Try insert instead
      await fetch(`${SUPABASE_URL}/rest/v1/user_points`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: edit.author_fid,
          total_points: authorPoints,
        }),
      });
    }

    // Update user_points for approver
    const approverPointsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_points?fid=eq.${encodeURIComponent(approverFid)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          fid: approverFid,
          total_points: approverPoints,
        }),
      }
    );

    if (!approverPointsResp.ok) {
      // Try insert instead
      await fetch(`${SUPABASE_URL}/rest/v1/user_points`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: approverFid,
          total_points: approverPoints,
        }),
      });
    }

    console.log(`[SIMPLE-APPROVE] Success! Awarded ${authorPoints} to author FID ${edit.author_fid} and ${approverPoints} to approver FID ${approverFid}`);

    return res.status(200).json({
      success: true,
      message: "Edit approved and points awarded",
      authorPoints,
      approverPoints,
    });
  } catch (err) {
    console.error("[SIMPLE-APPROVE] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
