import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type UlProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLUListElement>;
} & React.AriaAttributes;

export function Ul({ style, children, ref, ...props }: UlProps) {
  return (
    <ul ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </ul>
  );
}
