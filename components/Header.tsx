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

  // If host doesn't provide an avatar, generate a deterministic identicon based on the user's FID.
  function hashStringToInt(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function seededRandom(seed: number) {
    let state = seed >>> 0;
    return function () {
      // xorshift32
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state = state >>> 0;
      return state / 0xffffffff;
    };
  }

  function generateIdenticonDataUrl(seedInput: string | number | undefined, size = 64) {
    const seedStr = seedInput == null ? "anon" : String(seedInput);
    const seed = hashStringToInt(seedStr);
    const rand = seededRandom(seed);

    // pick a color
    const r = Math.floor(rand() * 200) + 30;
    const g = Math.floor(rand() * 200) + 30;
    const b = Math.floor(rand() * 200) + 30;
    const fill = `rgb(${r},${g},${b})`;
    const bg = "#ffffff";

    const grid = 5;
    const cell = Math.floor(size / grid);
    const halves = Math.ceil(grid / 2);

    let svg = `<?xml version='1.0' encoding='UTF-8'?>`;
    svg += `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>`;
    svg += `<rect width='100%' height='100%' fill='${bg}'/>`;

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < halves; x++) {
        const v = rand() > 0.5;
        if (!v) continue;
        const xx = x * cell;
        const yy = y * cell;
        // left cell
        svg += `<rect x='${xx}' y='${yy}' width='${cell}' height='${cell}' fill='${fill}'/>`;
        // mirror to right
        const mx = (grid - 1 - x) * cell;
        if (mx !== xx) svg += `<rect x='${mx}' y='${yy}' width='${cell}' height='${cell}' fill='${fill}'/>`;
      }
    }

    svg += `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  

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
              // identicon fallback based on fid or displayName
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generateIdenticonDataUrl(
                  (typeof user?.["fid"] === "string" || typeof user?.["fid"] === "number")
                    ? (user?.["fid"] as string | number)
                    : (typeof user?.["username"] === "string"
                        ? (user?.["username"] as string)
                        : typeof user?.["displayName"] === "string"
                        ? (user?.["displayName"] as string)
                        : undefined),
                  32
                )}
                alt="identicon"
                style={{ width: 32, height: 32, borderRadius: 999 }}
              />
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
