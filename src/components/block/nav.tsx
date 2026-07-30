import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type NavProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
  "aria-label"?: string;
};

export function Nav({ style, children, ref, ...rest }: NavProps) {
  return (
    <nav ref={ref} role="navigation" {...stylex.props(style)} {...rest}>
      {children}
    </nav>
  );
}
