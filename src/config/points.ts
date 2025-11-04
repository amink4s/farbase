// Points configuration for Farpedia contributions.
// Values can be overridden by environment variables.
export const POINTS_INITIAL = Number(process.env.POINTS_INITIAL ?? 50);
export const POINTS_EDIT = Number(process.env.POINTS_EDIT ?? 10);

// Helper to parse safe integers with fallback
function parseIntOrDefault(v: unknown, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
}

export const getPointsConfig = () => ({
  initial: parseIntOrDefault(process.env.POINTS_INITIAL, 50),
  edit: parseIntOrDefault(process.env.POINTS_EDIT, 10),
});

export default getPointsConfig();
