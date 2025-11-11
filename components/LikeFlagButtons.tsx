"use client";

import { useCallback, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type LikeFlagButtonsProps = {
  articleSlug: string;
  initialLikes: number;
  initialFlags: number;
  hasLiked: boolean;
  hasFlagged: boolean;
};

export function LikeFlagButtons({
  articleSlug,
  initialLikes,
  initialFlags,
  hasLiked,
  hasFlagged,
}: LikeFlagButtonsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [flags, setFlags] = useState(initialFlags);
  const [userHasLiked, setUserHasLiked] = useState(hasLiked);
  const [userHasFlagged, setUserHasFlagged] = useState(hasFlagged);
  const [isLiking, setIsLiking] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLike = useCallback(async () => {
    if (isLiking || userHasLiked) return;

    setIsLiking(true);
    setLikes((prev) => prev + 1);
    setUserHasLiked(true);
    setError(null);

    try {
      const response = await sdk.quickAuth.fetch(
        `/api/articles/${articleSlug}/like`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to like article:", data.error);
        // Revert optimistic update
        setLikes((prev) => prev - 1);
        setUserHasLiked(false);
        setError("Failed to like. Please try again.");
      } else {
        console.log("Article liked, points awarded:", data.pointsAwarded);
      }
    } catch (error) {
      console.error("Error liking article:", error);
      // Revert optimistic update
      setLikes((prev) => prev - 1);
      setUserHasLiked(false);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLiking(false);
    }
  }, [articleSlug, isLiking, userHasLiked]);

  const handleFlag = useCallback(async () => {
    if (isFlagging || userHasFlagged) return;

    setIsFlagging(true);
    setFlags((prev) => prev + 1);
    setUserHasFlagged(true);
    setError(null);

    try {
      const response = await sdk.quickAuth.fetch(
        `/api/articles/${articleSlug}/flag`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to flag article:", data.error);
        // Revert optimistic update
        setFlags((prev) => prev - 1);
        setUserHasFlagged(false);
        setError("Failed to flag. Please try again.");
      }
    } catch (error) {
      console.error("Error flagging article:", error);
      // Revert optimistic update
      setFlags((prev) => prev - 1);
      setUserHasFlagged(false);
      setError("An error occurred. Please try again.");
    } finally {
      setIsFlagging(false);
    }
  }, [articleSlug, isFlagging, userHasFlagged]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={handleLike}
          disabled={isLiking || userHasLiked}
        >
          {isLiking ? "Liking..." : `👍 Like (${likes})`}
        </button>
        <button
          onClick={handleFlag}
          disabled={isFlagging || userHasFlagged}
        >
          {isFlagging ? "Flagging..." : `🚩 Flag (${flags})`}
        </button>
      </div>
      {error && <p style={{ color: "red", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
