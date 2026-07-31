import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type ExpandableProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  /** Proportional flex weight. */
  weight?: number;
} & React.AriaAttributes;

export function Expandable({ children, style, weight, ref, ...props }: ExpandableProps) {
  const { style: sxStyle, ...rest } = stylex.props(styles.expandable, style);
  return (
    <div
      ref={ref}
      {...rest}
      style={{ "--flex-weight": weight ?? 1, ...sxStyle } as React.CSSProperties}
      {...props}
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
