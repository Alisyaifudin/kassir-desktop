import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

type Props = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
};

export function Block({ children, ref, style }: Props) {
  return (
    <div ref={ref} {...stylex.props(style)}>
      {children}
    </div>
  );
}
