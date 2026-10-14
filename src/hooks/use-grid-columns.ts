import { useScreenSize } from "./use-screen";
import { useSize } from "./use-size";

export type GridColumns = 3 | 4 | 5;

/**
 * Column count for the product grid: the shop pane is roughly the same width on
 * every window, so the ui size setting wins over the viewport, and the viewport
 * only refines it. Class names must stay literal for tailwind's scanner.
 */
export function useGridColumns(): GridColumns {
  const size = useSize();
  const { width } = useScreenSize();
  if (size === "small") return 3;
  if (width >= 1440) return 5;
  if (width >= 1024) return 4;
  return 3;
}

export const GRID_COLUMN_CLASS: Record<GridColumns, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};
