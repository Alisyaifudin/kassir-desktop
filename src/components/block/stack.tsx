import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type StackProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
} & React.AriaAttributes;

export function VStack({ children, style, ref, ...rest }: StackProps) {
  return (
    <div ref={ref} {...stylex.props(styles.vstack, style)} {...rest}>
      {children}
    </div>
  );
}

export function HStack({ children, style, ref, ...rest }: StackProps) {
  return (
    <div ref={ref} {...stylex.props(styles.hstack, style)} {...rest}>
      {children}
    </div>
  );
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
