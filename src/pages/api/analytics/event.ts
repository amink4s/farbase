import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event, payload } = req.body ?? {};
    // Basic validation
    if (!event) return res.status(400).json({ error: "Missing event" });

    // In production, forward to analytics provider here. For now, just log.
    console.log("Analytics event:", event, payload ?? {});
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("/api/analytics/event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
