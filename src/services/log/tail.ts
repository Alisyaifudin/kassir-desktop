/** How many log lines the viewer shows. The file stays the full record. */
export const LOG_VIEW_LIMIT = 500;

export type LogPage = {
  /** The newest lines, newest first. Bounded by `LOG_VIEW_LIMIT`. */
  lines: string[];
  /** How many lines the file actually holds, so the view can say so. */
  total: number;
};

/**
 * The tail of the log, newest first.
 *
 * Setting → Log is the screen an operator opens when the app is already
 * misbehaving, so it must never be the reason the window freezes: reading the
 * file is bounded here rather than in the component, and nothing is dropped
 * silently — warnings included, and `total` lets the page say it is a window.
 */
export function tailLog(text: string, limit: number = LOG_VIEW_LIMIT): LogPage {
  const lines = (text || "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .reverse();
  return { lines: lines.slice(0, limit), total: lines.length };
}
