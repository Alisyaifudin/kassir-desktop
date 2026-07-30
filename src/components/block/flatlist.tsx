import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";

type FlatListProps<T> = {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  /** Item size estimate for the virtualizer. Defaults to 50. */
  estimateSize?: number | ((index: number) => number);
  /** Scroll direction. @default "vertical" */
  direction?: "vertical" | "horizontal";
  style?: StyleXStyles;
  /** Number of items to render outside the visible area. @default 5 */
  overscan?: number;
};

export function FlatList<T>({
  data,
  renderItem,
  estimateSize = 50,
  direction = "vertical",
  style,
  overscan = 5,
}: FlatListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const horizontal = direction === "horizontal";

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:
      typeof estimateSize === "function" ? estimateSize : () => estimateSize,
    horizontal,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} {...stylex.props(styles.scroll, style)}>
      <div
        style={{
          [horizontal ? "width" : "height"]: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {items.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: horizontal ? 0 : virtualItem.start,
              left: horizontal ? virtualItem.start : 0,
              [horizontal ? "height" : "width"]: "100%",
            }}
          >
            {renderItem(data[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
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
});
