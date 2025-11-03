"use client";
import React from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Wallet } from "@coinbase/onchainkit/wallet";

export default function Header() {
  const mini = useMiniKit();
  const rawUser = mini?.context?.user as unknown | undefined;
  const user = typeof rawUser === "object" && rawUser !== null ? (rawUser as Record<string, unknown>) : undefined;

  const maybeDisplay = user && (user.displayName || user.name || user.handle || user.username || user.fid);
  const displayName = typeof maybeDisplay === "string" ? maybeDisplay : maybeDisplay ? String(maybeDisplay) : undefined;

  // Accept several common shapes; also check nested `profile` object which some hosts use.
  // Helper to extract avatar from common fields (prefer pfpUrl)
  function extractAvatar(u?: Record<string, unknown>): string | undefined {
    if (!u) return undefined;
    const keys = [
      "pfpUrl",
      "pfp_url",
      "pfp",
      "avatar",
      "profileImageUrl",
      "profile_image_url",
      "image",
      "picture",
      "imageUrl",
      "image_url",
    ];

    for (const k of keys) {
      const v = u[k] as unknown;
      if (typeof v === "string" && v.trim()) return v;
    }

    // try nested profile object
    const profile = u["profile"] as unknown;
    if (typeof profile === "object" && profile !== null) {
      const p = profile as Record<string, unknown>;
      for (const k of keys) {
        const v = p[k] as unknown;
        if (typeof v === "string" && v.trim()) return v;
      }
    }

    return undefined;
  }

  const avatarUrl = extractAvatar(user);

  const [showDebug, setShowDebug] = React.useState(false);

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}>
      <div>
        <strong>farpedia</strong>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: 999 }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 999, background: "#ddd" }} />
            )}
            <div style={{ fontSize: 14 }}>{displayName}</div>
          </div>
        ) : (
          // Wallet will prompt a sign-in / wallet connect in the miniapp
          <Wallet />
        )}
      </div>
      {user && (
        <div style={{ padding: 8 }}>
          <button onClick={() => setShowDebug((s) => !s)} style={{ fontSize: 12 }}>
            {showDebug ? "Hide profile JSON" : "Show profile JSON"}
          </button>
          {showDebug ? (
            <pre style={{ maxWidth: 480, overflowX: "auto", fontSize: 12 }}>{JSON.stringify(user, null, 2)}</pre>
          ) : null}
        </div>
      )}
    </header>
  );
}
