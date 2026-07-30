import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type ExpandableProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  /** Proportional flex weight. */
  weight?: number;
};

export function Expandable({ children, style, weight, ref }: ExpandableProps) {
  const { style: sxStyle, ...rest } = stylex.props(styles.expandable, style);
  return (
    <div
      ref={ref}
      {...rest}
      style={{ "--flex-weight": weight ?? 1, ...sxStyle } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

const styles = stylex.create({
  expandable: {
    minWidth: 0,
    minHeight: 0,
    flex: "var(--flex-weight) 1 0%",
    overflow: "auto",
  },
});
