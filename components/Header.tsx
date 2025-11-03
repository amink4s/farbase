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

  const maybeAvatar = user && (user.avatar || user.pfp || user.profileImageUrl || user.image || user.picture);
  const avatarUrl = typeof maybeAvatar === "string" ? maybeAvatar : undefined;

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
    </header>
  );
}
