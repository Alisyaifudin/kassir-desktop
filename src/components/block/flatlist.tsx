import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { Block } from "./block";

type FlatListProps<T> = {
  id?: string;
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  /** Item size estimate for the virtualizer. Defaults to 50. */
  estimateSize?: number | ((index: number) => number);
  /** Scroll direction. @default "vertical" */
  direction?: "vertical" | "horizontal";
  style?: StyleXStyles;
  /** Number of items to render outside the visible area. @default 5 */
  overscan?: number;
} & React.AriaAttributes;

export function FlatList<T>({
  data,
  renderItem,
  estimateSize = 50,
  direction = "vertical",
  style,
  overscan = 5,
  ...props
}: FlatListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHorizontal = direction === "horizontal";
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: typeof estimateSize === "function" ? estimateSize : () => estimateSize,
    horizontal: isHorizontal,
    overscan,
  });

  const items = virtualizer.getVirtualItems();
  const containerVar = useMemo(
    () =>
      isHorizontal
        ? {
            "--flatlist-width": virtualizer.getTotalSize(),
          }
        : {
            "--flatlist-height": virtualizer.getTotalSize(),
          },
    [isHorizontal, virtualizer],
  );
  const cellVar = useCallback(
    (start: number) =>
      isHorizontal
        ? {
            "--flatlist-cell-top": 0,
            "--flatlist-cell-left": start,
            "--flatlist-cell-height": "100%",
          }
        : {
            "--flatlist-cell-top": start,
            "--flatlist-cell-left": 0,
            "--flatlist-cell-width": "100%",
          },
    [isHorizontal],
  );
  return (
    <Block ref={scrollRef} style={[styles.scroll, style]} {...props}>
      <Block style={styles.container} cssVars={containerVar}>
        {items.map((virtualItem) => (
          <Block
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            cssVars={cellVar(virtualItem.start)}
            style={styles.cell}
          >
            {renderItem(data[virtualItem.index], virtualItem.index)}
          </Block>
        ))}
      </Block>
    </Block>
  );
}

const styles = stylex.create({
  scroll: {
    overflow: "auto",
    position: "relative",
    contain: "strict",
    width: "100%",
    height: "100%",
  },
  container: {
    width: `var(--flatlist-width, 100%)`,
    height: `var(--flatlist-height, 100%)`,
    position: "relative",
  },
  cell: {
    position: "absolute",
    top: "var(--flatlist-cell-top)",
    left: "var(--flatlist-cell-left)",
    height: "var(--flatlist-cell-height)",
    width: "var(--flatlist-cell-width)",
  },
});
