-- A reusable function to increment a user's point total.
-- This avoids race conditions by performing a read-modify-write in a single transaction.
CREATE OR REPLACE FUNCTION increment_user_points(user_fid_to_update BIGINT, points_to_add INT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_points (fid, total_points)
  VALUES (user_fid_to_update, points_to_add)
  ON CONFLICT (fid)
  DO UPDATE SET total_points = user_points.total_points + points_to_add;
END;
$$ LANGUAGE plpgsql;
