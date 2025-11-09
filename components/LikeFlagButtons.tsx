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

  const handleLike = useCallback(async () => {
    if (isLiking || userHasLiked) return;
    setIsLiking(true);

    try {
      const response = await sdk.quickAuth.fetch(
        `/api/articles/${articleSlug}/like`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (response.ok) {
        setLikes((prev) => prev + 1);
        setUserHasLiked(true);
        console.log("Article liked, points awarded:", data.pointsAwarded);
      } else {
        console.error("Failed to like article:", data.error);
      }
    } catch (error) {
      console.error("Error liking article:", error);
    } finally {
      setIsLiking(false);
    }
  }, [articleSlug, isLiking, userHasLiked]);

  const handleFlag = useCallback(async () => {
    if (isFlagging || userHasFlagged) return;
    setIsFlagging(true);

    try {
      const response = await sdk.quickAuth.fetch(
        `/api/articles/${articleSlug}/flag`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (response.ok) {
        setFlags((prev) => prev + 1);
        setUserHasFlagged(true);
      } else {
        console.error("Failed to flag article:", data.error);
      }
    } catch (error) {
      console.error("Error flagging article:", error);
    } finally {
      setIsFlagging(false);
    }
  }, [articleSlug, isFlagging, userHasFlagged]);

  return (
    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
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
  );
}
