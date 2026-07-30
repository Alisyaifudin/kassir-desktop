import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type StackProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export function VStack({ children, style, ref }: StackProps) {
  return <div ref={ref} {...stylex.props(styles.vstack, style)}>{children}</div>;
}

export function HStack({ children, style, ref }: StackProps) {
  return <div ref={ref} {...stylex.props(styles.hstack, style)}>{children}</div>;
}

const styles = stylex.create({
  vstack: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  hstack: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },
});
