import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type LiProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLLIElement>;
};

export function Li({ style, children, ref, ...rest }: LiProps) {
  return (
    <li ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </li>
  );
}
