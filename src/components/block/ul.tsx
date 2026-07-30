import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type UlProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLUListElement>;
};

export function Ul({ style, children, ref, ...rest }: UlProps) {
  return (
    <ul ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </ul>
  );
}
